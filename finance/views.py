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
    filterset_fields = ['method', 'student']
    search_fields = ['student__full_name', 'notes']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['title', 'notes']


class MonthlyChargeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MonthlyCharge.objects.select_related('course_class', 'charged_by').prefetch_related('entries').order_by('-date')
    serializer_class = MonthlyChargeSerializer


class FinanceSummaryView(views.APIView):
    permission_classes = [IsCEOOrDev]

    def get(self, request):
        total_income = Payment.objects.aggregate(t=Sum('amount'))['t'] or 0
        total_expenses = Expense.objects.aggregate(t=Sum('amount'))['t'] or 0

        # Monthly trend for charts (last 6 months)
        income_trend = (
            Payment.objects.annotate(month=TruncMonth('date'))
            .values('month').annotate(total=Sum('amount')).order_by('month')
        )
        expense_trend = (
            Expense.objects.annotate(month=TruncMonth('date'))
            .values('month').annotate(total=Sum('amount')).order_by('month')
        )

        # Expense by category breakdown for pie chart
        by_category = (
            Expense.objects.values('category')
            .annotate(total=Sum('amount')).order_by('-total')
        )

        def fmt_trend(qs):
            return [{'month': i['month'].strftime('%b %Y'), 'total': float(i['total'])} for i in qs if i['month']]

        return Response({
            'total_income': float(total_income),
            'total_expenses': float(total_expenses),
            'net_profit': float(total_income - total_expenses),
            'income_trend': fmt_trend(income_trend),
            'expense_trend': fmt_trend(expense_trend),
            'by_category': [{'category': r['category'], 'total': float(r['total'])} for r in by_category],
        })
