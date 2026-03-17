from rest_framework import viewsets, views, status
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from config.permissions import IsCEOOrDev
from .models import Payment, Expense, MonthlyCharge, MonthlyChargeEntry
from .serializers import PaymentSerializer, ExpenseSerializer, MonthlyChargeSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('student').all().order_by('-date')
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'method': ['exact'],
        'student': ['exact'],
        'date': ['gte', 'lte', 'exact'],
    }
    search_fields = ['student__full_name', 'notes']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'category': ['exact'],
        'date': ['gte', 'lte', 'exact'],
    }
    search_fields = ['title', 'notes']


class MonthlyChargeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MonthlyCharge.objects.select_related('course_class', 'charged_by').prefetch_related('entries').order_by('-date')
    serializer_class = MonthlyChargeSerializer


class FinanceSummaryView(views.APIView):
    permission_classes = [IsCEOOrDev]

    def get(self, request):
        from datetime import datetime, date, timedelta
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # 1. Base Querysets
        payments_qs = Payment.objects.all()
        expenses_qs = Expense.objects.all()

        current_start = None
        current_end = None
        
        if start_date_str and end_date_str:
            try:
                current_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                current_end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                payments_qs = payments_qs.filter(date__gte=current_start, date__lte=current_end)
                expenses_qs = expenses_qs.filter(date__gte=current_start, date__lte=current_end)
            except ValueError:
                pass


        # 2. Current Period Metrics
        total_income = payments_qs.aggregate(t=Sum('amount'))['t'] or 0
        total_expenses = expenses_qs.aggregate(t=Sum('amount'))['t'] or 0
        net_profit = total_income - total_expenses

        # 3. Previous Period Metrics (for comparison)
        prev_income = 0
        prev_expenses = 0
        prev_profit = 0
        has_prev = False

        if current_start and current_end:
            has_prev = True
            delta = current_end - current_start
            prev_end = current_start - timedelta(days=1)
            prev_start = prev_end - delta

            prev_payments_qs = Payment.objects.filter(date__gte=prev_start, date__lte=prev_end)
            prev_expenses_qs = Expense.objects.filter(date__gte=prev_start, date__lte=prev_end)

            prev_income = prev_payments_qs.aggregate(t=Sum('amount'))['t'] or 0
            prev_expenses = prev_expenses_qs.aggregate(t=Sum('amount'))['t'] or 0
            prev_profit = prev_income - prev_expenses

        def calc_change(curr, prev):
            if not has_prev: return None
            if prev == 0: return 100 if curr > 0 else 0 if curr == 0 else -100
            return float(((curr - prev) / abs(prev)) * 100)

        # 4. Total Debt calculation
        from students.models import Student
        total_debt_agg = Student.objects.filter(balance__lt=0).aggregate(t=Sum('balance'))['t']
        total_debt = abs(total_debt_agg) if total_debt_agg else 0

        # 5. Trends (Daily or Monthly depending on range)
        from django.db.models.functions import TruncDay, TruncMonth
        is_daily = False
        if current_start and current_end and (current_end - current_start).days <= 31:
            is_daily = True

        trunc_func = TruncDay if is_daily else TruncMonth
        fmt_str = '%b %d' if is_daily else '%b %Y'

        income_trend = (
            payments_qs.annotate(period=trunc_func('date'))
            .values('period').annotate(total=Sum('amount')).order_by('period')
        )
        expense_trend = (
            expenses_qs.annotate(period=trunc_func('date'))
            .values('period').annotate(total=Sum('amount')).order_by('period')
        )

        def fmt_trend(qs):
            return [{'period': i['period'].strftime(fmt_str), 'total': float(i['total'])} for i in qs if i['period']]

        # 6. Breakdowns
        expense_by_category = (
            expenses_qs.values('category')
            .annotate(total=Sum('amount')).order_by('-total')
        )
        income_by_method = (
            payments_qs.values('method')
            .annotate(total=Sum('amount')).order_by('-total')
        )

        return Response({
            'metrics': {
                'income': float(total_income),
                'expenses': float(total_expenses),
                'profit': float(net_profit),
                'total_debt': float(total_debt),
            },
            'comparisons': {
                'has_comparison': has_prev,
                'income_change': calc_change(total_income, prev_income),
                'expenses_change': calc_change(total_expenses, prev_expenses),
                'profit_change': calc_change(net_profit, prev_profit),
            },
            'trends': {
                'is_daily': is_daily,
                'income': fmt_trend(income_trend),
                'expenses': fmt_trend(expense_trend),
            },
            'breakdowns': {
                'expense_by_category': [{'label': r['category'], 'total': float(r['total'])} for r in expense_by_category],
                'income_by_method': [{'label': r['method'], 'total': float(r['total'])} for r in income_by_method],
            }
        })
