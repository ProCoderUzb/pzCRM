from django.db import models

class Lead(models.Model):
    STATUS_CHOICES = (
        ('NEW', 'New Inquiry'),
        ('CONTACTED', 'Contacted'),
        ('TRIAL_SCHEDULED', 'Trial Scheduled'),
        ('TRIAL_DONE', 'Trial Done'),
        ('ENROLLED', 'Enrolled'),
        ('REJECTED', 'Rejected / Lost'),
    )
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.get_status_display()})"


class Student(models.Model):
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=20, blank=True)
    parent_name = models.CharField(max_length=200, blank=True)
    parent_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    joined_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    # Balance: goes DOWN (negative) when monthly fee is charged, UP when payment is received
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return self.full_name
