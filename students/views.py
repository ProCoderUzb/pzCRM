from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from config.permissions import IsTeacherReadOnlyOrFullAccess, IsAdminOrCEOOrDev
from .models import Lead, Student
from .serializers import LeadSerializer, StudentSerializer


class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrCEOOrDev]
    queryset = Lead.objects.all().order_by('-created_at')
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['full_name', 'phone_number']


class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTeacherReadOnlyOrFullAccess]
    queryset = Student.objects.all().order_by('full_name')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['full_name', 'phone_number', 'parent_name']

    def get_queryset(self):
        qs = super().get_queryset()
        # Balance filter
        balance_filter = self.request.query_params.get('balance_filter')
        if balance_filter == 'debt':
            qs = qs.filter(balance__lt=0)
        elif balance_filter == 'zero':
            qs = qs.filter(balance=0)
        elif balance_filter == 'plus':
            qs = qs.filter(balance__gt=0)
        # Group/class filter
        class_id = self.request.query_params.get('class_id')
        if class_id:
            qs = qs.filter(classes__id=class_id)
        return qs

    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        old_balance = serializer.instance.balance
        new_balance = serializer.validated_data.get('balance', old_balance)
        if new_balance != old_balance and self.request.user.role not in ['CEO', 'DEV', 'ADMIN']:
            raise PermissionDenied("Sizda o'quvchi balansini o'zgartirish huquqi yo'q.")
        serializer.save()


    def destroy(self, request, *args, **kwargs):
        """
        Hard-delete is only permitted on archived (inactive) students,
        and only by CEO / DEV / ADMIN roles.
        """
        if request.user.role not in ['CEO', 'DEV', 'ADMIN']:
            return Response(
                {'error': "Faqat administrator o'chirishga ruxsat berilgan."},
                status=status.HTTP_403_FORBIDDEN,
            )
        student = self.get_object()
        if student.is_active:
            return Response(
                {'error': "Avval o'quvchini arxivlang, keyin o'chiring."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive_student(self, request, pk=None):
        """Set is_active=False and unenroll from all groups."""
        if request.user.role not in ['CEO', 'DEV', 'ADMIN']:
            return Response({'error': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)
        student = self.get_object()
        if not student.is_active:
            return Response({'error': 'O\'quvchi allaqachon arxivda.'}, status=status.HTTP_400_BAD_REQUEST)
        # Unenroll from all classes
        student.classes.clear()
        student.is_active = False
        student.save(update_fields=['is_active'])
        return Response({'ok': True, 'message': f'{student.full_name} arxivlandi.'})

    @action(detail=True, methods=['post'], url_path='restore')
    def restore_student(self, request, pk=None):
        """Restore an archived student (set is_active=True)."""
        if request.user.role not in ['CEO', 'DEV', 'ADMIN']:
            return Response({'error': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)
        student = self.get_object()
        if student.is_active:
            return Response({'error': 'O\'quvchi allaqachon faol.'}, status=status.HTTP_400_BAD_REQUEST)
        student.is_active = True
        student.save(update_fields=['is_active'])
        return Response({'ok': True, 'message': f'{student.full_name} tiklandi.'})

    @action(detail=True, methods=['get'], url_path='profile')
    def profile(self, request, pk=None):
        student = self.get_object()

        # 1. Base Info
        data = StudentSerializer(student).data

        # 2. Enrolled Classes
        classes = student.classes.all()
        data['enrolled_classes'] = [
            {'id': c.id, 'name': c.name, 'teacher': c.teacher.get_full_name() if c.teacher else 'N/A', 'monthly_fee': c.monthly_fee}
            for c in classes
        ]

        # 3. Payments (Income)
        payments = student.payments.all().order_by('-date', '-created_at')
        data['payments'] = [
            {'id': p.id, 'amount': p.amount, 'date': p.date, 'method': p.method, 'notes': p.notes}
            for p in payments
        ]

        # 4. Attendance History & Stats
        attendances = student.attendance_records.select_related('course_class').order_by('-date')
        data['attendance_history'] = [
            {'id': a.id, 'date': a.date, 'status': a.status, 'class_name': a.course_class.name, 'notes': a.notes}
            for a in attendances
        ]

        total_missed = sum(1 for a in attendances if a.status == 'ABSENT')
        data['stats'] = {
            'total_missed': total_missed
        }

        return Response(data)
