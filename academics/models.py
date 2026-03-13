from django.db import models
from django.db import transaction
from users.models import User
from students.models import Student


class Subject(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Room(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField(default=20)

    def __str__(self):
        return self.name


class CourseClass(models.Model):
    DAYS_OF_WEEK = (
        ('MON', 'Monday'), ('TUE', 'Tuesday'), ('WED', 'Wednesday'),
        ('THU', 'Thursday'), ('FRI', 'Friday'), ('SAT', 'Saturday'), ('SUN', 'Sunday'),
    )

    name = models.CharField(max_length=100)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='classes')
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        limit_choices_to={'role': 'TEACHER'}, related_name='classes'
    )
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='classes')
    students = models.ManyToManyField(Student, related_name='classes', blank=True)
    days = models.CharField(max_length=100, blank=True, help_text="e.g. MON,WED,FRI")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    capacity = models.PositiveIntegerField(default=15)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} — {self.subject.name}"

    def charge_monthly_fee(self, charged_by):
        """
        Deduct monthly_fee from each enrolled active student's balance.
        Credit teacher's balance based on their salary_share percentage.
        Create a MonthlyCharge record for audit.
        """
        from finance.models import MonthlyCharge, MonthlyChargeEntry
        from django.utils import timezone

        with transaction.atomic():
            charge = MonthlyCharge.objects.create(
                course_class=self,
                charged_by=charged_by,
                fee_amount=self.monthly_fee,
                date=timezone.now().date(),
            )
            active_students = self.students.filter(is_active=True)
            for student in active_students:
                student.balance -= self.monthly_fee
                student.save(update_fields=['balance'])
                MonthlyChargeEntry.objects.create(charge=charge, student=student, amount=self.monthly_fee)

            # Credit teacher
            if self.teacher and self.teacher.salary_share > 0:
                teacher_cut = (self.monthly_fee * self.teacher.salary_share / 100) * active_students.count()
                self.teacher.balance += teacher_cut
                self.teacher.save(update_fields=['balance'])
                charge.teacher_payout = teacher_cut
                charge.save(update_fields=['teacher_payout'])

        return charge


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('EXCUSED', 'Excused'),
    )
    course_class = models.ForeignKey(CourseClass, on_delete=models.CASCADE, related_name='attendance_records')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PRESENT')
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('course_class', 'student', 'date')

    def __str__(self):
        return f"{self.student} — {self.course_class} on {self.date} ({self.status})"
