from django.db import models
from students.models import Student


class Payment(models.Model):
    """Manual payment recorded when a student pays (increases their balance)."""
    METHOD_CHOICES = (
        ('CASH', 'Cash'), ('CARD', 'Card'), ('TRANSFER', 'Bank Transfer'), ('OTHER', 'Other'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default='CASH')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Automatically credit the student's balance on new payment
        if not self.pk:
            self.student.balance += self.amount
            self.student.save(update_fields=['balance'])
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} paid {self.amount} on {self.date}"


class Expense(models.Model):
    """Center-level operational expenses (salary, rent, etc.)."""
    CATEGORY_CHOICES = (
        ('SALARY', 'Salary'), ('RENT', 'Rent'), ('UTILITIES', 'Utilities'),
        ('SUPPLIES', 'Supplies'), ('MARKETING', 'Marketing'), ('OTHER', 'Other'),
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES, default='OTHER')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.amount} ({self.category})"


class MonthlyCharge(models.Model):
    """Audit record each time an admin runs 'Charge Monthly Fee' on a class."""
    from academics.models import CourseClass
    from users.models import User

    course_class = models.ForeignKey('academics.CourseClass', on_delete=models.CASCADE, related_name='charges')
    charged_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='charges_made')
    date = models.DateField()
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    teacher_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Charge {self.course_class} on {self.date}"


class MonthlyChargeEntry(models.Model):
    """One entry per student per charge cycle."""
    charge = models.ForeignKey(MonthlyCharge, on_delete=models.CASCADE, related_name='entries')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='charge_entries')
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.student} charged {self.amount}"
