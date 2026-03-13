from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
import traceback
from config.permissions import IsTeacherReadOnlyOrFullAccess, IsTeacherReadOnlyOrFullAccessOrAttendance
from .models import Subject, Room, CourseClass, Attendance
from students.models import Student, Lead
from .serializers import SubjectSerializer, RoomSerializer, CourseClassSerializer, AttendanceSerializer


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsTeacherReadOnlyOrFullAccess]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsTeacherReadOnlyOrFullAccess]


class CourseClassViewSet(viewsets.ModelViewSet):
    queryset = CourseClass.objects.select_related('teacher', 'room', 'subject').prefetch_related('students').all()
    serializer_class = CourseClassSerializer
    permission_classes = [IsTeacherReadOnlyOrFullAccess]

    def get_queryset(self):
        qs = super().get_queryset()
        # Teachers can only see their own classes
        if self.request.user.role == 'TEACHER':
            qs = qs.filter(teacher=self.request.user)
        return qs

    @action(detail=True, methods=['get'], url_path='detail')
    def class_detail(self, request, pk=None):
        """
        Full class detail: meta + enrolled students + recent attendance history
        GET /api/classes/{id}/detail/
        """
        from django.db.models import Count, Q
        course_class = self.get_object()

        # --- Meta
        meta = CourseClassSerializer(course_class).data

        # --- Students
        students_qs = course_class.students.all()
        students = [
            {'id': s.id, 'full_name': s.full_name, 'phone_number': s.phone_number,
             'balance': float(s.balance), 'is_active': s.is_active}
            for s in students_qs
        ]

        # --- Last 30 days attendance records per student
        from datetime import date, timedelta
        thirty_ago = date.today() - timedelta(days=30)
        att_records = Attendance.objects.filter(
            course_class=course_class, date__gte=thirty_ago
        ).order_by('date')

        # Pivot: {student_id: {date_str: status}}
        att_by_student: dict = {}
        dates_set: set = set()
        for rec in att_records:
            d = str(rec.date)
            dates_set.add(d)
            att_by_student.setdefault(rec.student_id, {})[d] = rec.status

        sorted_dates = sorted(dates_set)

        # Per-student attendance summary
        att_summary = []
        for s in students_qs:
            rec_map = att_by_student.get(s.id, {})
            row = {
                'student_id': s.id,
                'student': s.full_name,
                'total': len(sorted_dates),
                'present': sum(1 for d in sorted_dates if rec_map.get(d) == 'PRESENT'),
                'absent':  sum(1 for d in sorted_dates if rec_map.get(d) == 'ABSENT'),
                'late':    sum(1 for d in sorted_dates if rec_map.get(d) == 'LATE'),
                'excused': sum(1 for d in sorted_dates if rec_map.get(d) == 'EXCUSED'),
                'daily':   {d: rec_map.get(d, '') for d in sorted_dates},
            }
            row['rate'] = round(row['present'] / row['total'] * 100, 1) if row['total'] else 0
            att_summary.append(row)

        # --- Daily overall stats (for line chart)
        daily_stats = []
        for d in sorted_dates:
            day_recs = [att_by_student.get(sid, {}).get(d, '') for sid in att_by_student]
            daily_stats.append({
                'date': d,
                'present': day_recs.count('PRESENT'),
                'absent':  day_recs.count('ABSENT'),
                'late':    day_recs.count('LATE'),
                'excused': day_recs.count('EXCUSED'),
            })

        return Response({
            'meta': meta,
            'students': students,
            'attendance_dates': sorted_dates,
            'attendance_summary': att_summary,
            'daily_stats': daily_stats,
        })

    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll_student(self, request, pk=None):
        course_class = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        course_class.students.add(student)
        return Response({'ok': True})

    @action(detail=True, methods=['post'], url_path='unenroll')
    def unenroll_student(self, request, pk=None):
        course_class = self.get_object()
        student_id = request.data.get('student_id')
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        course_class.students.remove(student)
        return Response({'ok': True})

    @action(detail=True, methods=['get'], url_path='students')
    def list_students(self, request, pk=None):
        course_class = self.get_object()
        students = course_class.students.all()
        data = [
            {'id': s.id, 'full_name': s.full_name, 'balance': float(s.balance), 'is_active': s.is_active}
            for s in students
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='charge')
    def charge_monthly_fee(self, request, pk=None):
        from finance.models import MonthlyCharge, MonthlyChargeEntry
        course_class = self.get_object()

        if not course_class.monthly_fee or float(course_class.monthly_fee) <= 0:
            return Response({'error': 'Monthly fee is not set for this class.'}, status=status.HTTP_400_BAD_REQUEST)

        discounts_raw = request.data.get('discounts', {}) or {}
        discounts: dict = {}
        for k, v in discounts_raw.items():
            try:
                discounts[str(k)] = max(float(v), 0)
            except (TypeError, ValueError):
                discounts[str(k)] = 0

        try:
            with transaction.atomic():
                base_fee = float(course_class.monthly_fee)
                charge = MonthlyCharge.objects.create(
                    course_class=course_class, charged_by=request.user,
                    fee_amount=course_class.monthly_fee, date=timezone.now().date(),
                )
                active_students = list(course_class.students.filter(is_active=True))
                if not active_students:
                    return Response({'error': 'No active students enrolled in this class.'}, status=status.HTTP_400_BAD_REQUEST)

                total_charged = 0.0
                from decimal import Decimal
                for student in active_students:
                    discount = discounts.get(str(student.id), 0)
                    amount = max(base_fee - discount, 0)
                    student.balance = student.balance - Decimal(str(amount))
                    student.save(update_fields=['balance'])
                    MonthlyChargeEntry.objects.create(charge=charge, student=student, amount=amount)
                    total_charged += amount

                teacher_payout = 0.0
                if course_class.teacher:
                    # Check for absolute payout override
                    override = request.data.get('teacher_payout_override')
                    if override is not None:
                        try:
                            teacher_payout = float(override)
                        except (TypeError, ValueError):
                            pass
                    else:
                        # Fallback to percentage calculation
                        share = float(course_class.teacher.salary_share or 0)
                        if share > 0:
                            teacher_payout = base_fee * share / 100 * len(active_students)

                    if teacher_payout > 0:
                        course_class.teacher.balance = course_class.teacher.balance + Decimal(str(teacher_payout))
                    
                    course_class.teacher.save(update_fields=['balance'])
                    charge.teacher_payout = teacher_payout
                    charge.save(update_fields=['teacher_payout'])

            return Response({
                'ok': True, 'charge_id': charge.id,
                'students_charged': len(active_students),
                'total_charged': total_charged, 'teacher_payout': teacher_payout,
            })
        except Exception as exc:
            return Response({'error': str(exc), 'detail': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('student', 'course_class').all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsTeacherReadOnlyOrFullAccessOrAttendance]

    def get_queryset(self):
        qs = super().get_queryset()
        course_class = self.request.query_params.get('course_class')
        date = self.request.query_params.get('date')
        student = self.request.query_params.get('student')
        date_from = self.request.query_params.get('from')
        date_to = self.request.query_params.get('to')

        # Teachers can only see attendance for their own classes
        if self.request.user.role == 'TEACHER':
            qs = qs.filter(course_class__teacher=self.request.user)

        if course_class:
            qs = qs.filter(course_class_id=course_class)
        if date:
            qs = qs.filter(date=date)
        if student:
            qs = qs.filter(student_id=student)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs


class DashboardStatsView(views.APIView):
    def get(self, request):
        from finance.models import Payment, Expense
        from django.db.models import Sum
        total_students  = Student.objects.filter(is_active=True).count()
        total_leads     = Lead.objects.exclude(status__in=['ENROLLED', 'REJECTED']).count()
        new_leads       = Lead.objects.filter(status='NEW').count()
        total_classes   = CourseClass.objects.count()
        total_income    = Payment.objects.aggregate(t=Sum('amount'))['t'] or 0
        total_expenses  = Expense.objects.aggregate(t=Sum('amount'))['t'] or 0
        in_debt         = Student.objects.filter(balance__lt=0).count()
        return Response({
            'total_students': total_students, 'total_active_leads': total_leads,
            'new_leads': new_leads, 'total_classes': total_classes,
            'total_income': float(total_income), 'total_expenses': float(total_expenses),
            'net_profit': float(total_income - total_expenses), 'students_in_debt': in_debt,
        })
