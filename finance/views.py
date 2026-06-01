from decimal import Decimal
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from config.permissions import IsCEOOrDev, IsAdminOrCEOOrDev
from .models import Payment, Expense, MonthlyCharge, MonthlyChargeEntry
from .serializers import PaymentSerializer, ExpenseSerializer, MonthlyChargeSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrCEOOrDev]
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
    permission_classes = [IsCEOOrDev]
    queryset = Expense.objects.all().order_by('-date', '-id')
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'category': ['exact'],
        'date': ['gte', 'lte', 'exact'],
    }
    search_fields = ['title', 'notes']


def run_auto_monthly_billing():
    from academics.models import CourseClass
    from finance.models import MonthlyCharge
    from django.utils import timezone

    today = timezone.now().date()
    # Find all active classes that have a monthly fee and are not archived
    active_classes = CourseClass.objects.filter(is_archived=False, monthly_fee__gt=0)
    
    for c in active_classes:
        # Check if already charged for this month
        already_charged = MonthlyCharge.objects.filter(
            course_class=c,
            date__year=today.year,
            date__month=today.month
        ).exists()
        
        if not already_charged:
            try:
                c.charge_monthly_fee(charged_by=None)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Auto-billing failed for class {c.id}: {str(e)}")


class MonthlyChargeViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminOrCEOOrDev]
    queryset = MonthlyCharge.objects.select_related('course_class', 'charged_by').prefetch_related('entries').order_by('-date')
    serializer_class = MonthlyChargeSerializer


class TeacherSalaryView(views.APIView):
    """
    GET /api/finance/teacher-salaries/?month=2026-05
    Returns salary data for all teachers:
    - Their groups and total payments collected from those groups in the given month
    - Default salary_share %
    - Calculated salary based on collected payments
    """
    permission_classes = [IsCEOOrDev]

    def get(self, request):
        from datetime import datetime
        from users.models import User
        from academics.models import CourseClass

        month_str = request.query_params.get('month', '')
        if month_str:
            try:
                year, month = int(month_str[:4]), int(month_str[5:7])
                from django.utils import timezone
                import calendar
                last_day = calendar.monthrange(year, month)[1]
                from datetime import date
                start_date = date(year, month, 1)
                end_date = date(year, month, last_day)
            except (ValueError, IndexError):
                return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            from datetime import date
            import calendar
            today = date.today()
            year, month = today.year, today.month
            last_day = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, last_day)

        teachers = User.objects.filter(
            status='ACTIVE'
        ).exclude(role='DEV').order_by('first_name', 'username')

        result = []
        for teacher in teachers:
            active_classes = teacher.classes.filter(is_archived=False)
            groups_data = []
            teacher_total_income = Decimal('0')

            for cls in active_classes:
                # 1. Sum all payments explicitly associated with this class
                explicit_payments = Payment.objects.filter(
                    course_class=cls,
                    date__gte=start_date,
                    date__lte=end_date
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                # 2. Add proportional share of global payments (where course_class is null)
                proportional_payments = Decimal('0')
                for student in cls.students.all():
                    student_global_total = Payment.objects.filter(
                        student=student,
                        course_class__isnull=True,
                        date__gte=start_date,
                        date__lte=end_date
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                    
                    if student_global_total > 0:
                        enrolled_classes = student.classes.filter(is_archived=False)
                        total_fees = sum(Decimal(str(c.monthly_fee)) for c in enrolled_classes)
                        if total_fees > 0:
                            share = Decimal(str(cls.monthly_fee)) / total_fees
                            proportional_payments += student_global_total * share
                        else:
                            proportional_payments += student_global_total

                month_payments = explicit_payments + proportional_payments

                # Also sum charges (fees billed) during this month for reference
                month_charges = MonthlyChargeEntry.objects.filter(
                    charge__course_class=cls,
                    charge__date__gte=start_date,
                    charge__date__lte=end_date
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                groups_data.append({
                    'id': cls.id,
                    'name': cls.name,
                    'student_count': cls.students.filter(is_active=True).count(),
                    'monthly_fee': float(cls.monthly_fee),
                    'month_payments_received': float(month_payments),
                    'month_fees_charged': float(month_charges),
                })
                teacher_total_income += month_payments

            salary_share = float(teacher.salary_share or 0)
            calculated_salary = float(teacher_total_income) * salary_share / 100

            # Find already paid salary for this month
            expense_title = f"Oylik: {teacher.get_full_name() or teacher.username} ({year}-{month:02d})"
            already_paid = Expense.objects.filter(
                category='SALARY',
                title=expense_title
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            result.append({
                'id': teacher.id,
                'display_name': teacher.get_full_name() or teacher.username,
                'username': teacher.username,
                'salary_share': salary_share,
                'groups': groups_data,
                'total_income_from_groups': float(teacher_total_income),
                'calculated_salary': calculated_salary,
                'already_paid': float(already_paid),
            })

        return Response({
            'month': f'{year}-{month:02d}',
            'teachers': result,
        })


class PaySalaryView(views.APIView):
    """
    POST /api/finance/pay-salary/
    Pays a teacher's salary:
    - Creates an Expense record (category=SALARY) automatically
    - Records the payment with amount, bonus, and notes

    Body:
      teacher_id: int
      base_amount: float        (calculated salary)
      bonus_amount: float       (optional additional bonus)
      notes: str                (optional)
      month: str                (YYYY-MM, for the expense title)
    """
    permission_classes = [IsCEOOrDev]

    def post(self, request):
        from users.models import User
        from datetime import date

        teacher_id = request.data.get('teacher_id')
        base_amount = request.data.get('base_amount', 0)
        bonus_amount = request.data.get('bonus_amount', 0)
        notes = request.data.get('notes', '')
        month = request.data.get('month', date.today().strftime('%Y-%m'))

        try:
            teacher = User.objects.get(pk=teacher_id, status='ACTIVE')
        except User.DoesNotExist:
            return Response({'error': 'Xodim topilmadi yoki faol emas.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            base = Decimal(str(base_amount))
            bonus = Decimal(str(bonus_amount))
            total = base + bonus
        except Exception:
            return Response({'error': 'Invalid amount values.'}, status=status.HTTP_400_BAD_REQUEST)

        if total <= 0:
            return Response({'error': 'Total salary must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-create an Expense record
        expense_title = f"Oylik: {teacher.get_full_name() or teacher.username} ({month})"
        if bonus > 0:
            expense_notes = f"Asosiy: {float(base):,.0f}, Bonus: {float(bonus):,.0f}. {notes}".strip('. ')
        else:
            expense_notes = notes

        expense = Expense.objects.create(
            title=expense_title,
            amount=total,
            date=date.today(),
            category='SALARY',
            notes=expense_notes,
        )

        return Response({
            'ok': True,
            'teacher': teacher.get_full_name() or teacher.username,
            'total_paid': float(total),
            'expense_id': expense.id,
            'expense_title': expense_title,
        })


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


class ChargeAllGroupsView(views.APIView):
    permission_classes = [IsCEOOrDev]

    def get(self, request):
        """
        Check if there are any active groups that haven't been charged this month.
        """
        from academics.models import CourseClass
        from django.utils import timezone
        
        today = timezone.now().date()
        active_classes = CourseClass.objects.filter(is_archived=False, monthly_fee__gt=0)
        
        uncharged_classes = []
        for c in active_classes:
            already_charged = MonthlyCharge.objects.filter(
                course_class=c,
                date__year=today.year,
                date__month=today.month
            ).exists()
            if not already_charged:
                uncharged_classes.append(c.name)
                
        return Response({
            'already_charged': len(uncharged_classes) == 0,
            'uncharged_classes_count': len(uncharged_classes),
            'uncharged_classes_names': uncharged_classes,
        })

    def post(self, request):
        """
        Charges all active groups at once that haven't been charged this month yet.
        """
        from academics.models import CourseClass
        from django.utils import timezone
        
        today = timezone.now().date()
        active_classes = CourseClass.objects.filter(is_archived=False, monthly_fee__gt=0)
        
        charged_count = 0
        total_charged_amount = 0.0
        
        for c in active_classes:
            already_charged = MonthlyCharge.objects.filter(
                course_class=c,
                date__year=today.year,
                date__month=today.month
            ).exists()
            
            if not already_charged:
                try:
                    charge = c.charge_monthly_fee(charged_by=request.user)
                    charged_count += 1
                    # Sum the entries for this charge
                    total_charged_amount += sum(float(entry.amount) for entry in charge.entries.all())
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Manual batch billing failed for class {c.id}: {str(e)}")
                    
        return Response({
            'ok': True,
            'classes_charged': charged_count,
            'total_charged': total_charged_amount,
        })

