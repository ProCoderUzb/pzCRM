from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Lead, Student
from .serializers import LeadSerializer, StudentSerializer

class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all().order_by('-created_at')
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['full_name', 'phone_number']

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('full_name')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['full_name', 'phone_number', 'parent_name']

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
        
        # 4. Charges (Deductions)
        charges = student.charge_entries.select_related('charge__course_class').order_by('-charge__date', '-id')
        data['charges'] = [
            {'id': ce.id, 'amount': ce.amount, 'date': ce.charge.date, 'class_name': ce.charge.course_class.name}
            for ce in charges
        ]
        
        # 5. Attendance History & Stats
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
