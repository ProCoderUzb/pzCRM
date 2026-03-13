from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError


class User(AbstractUser):
    """
    Three operational roles + protected DEV:
      DEV    — developer/superuser (Django superuser only, cannot be assigned via CRM)
      CEO    — owner, full access, only 1 allowed
      ADMIN  — administrator, limited access (no staff status changes, no financial stats)
      TEACHER — can only see own classes/attendance, schedule, rooms, subjects (read-only)
    """
    class Role(models.TextChoices):
        DEV     = 'DEV',     'Developer'
        CEO     = 'CEO',     'CEO / Owner'
        ADMIN   = 'ADMIN',   'Administrator'
        TEACHER = 'TEACHER', 'Teacher'

    class Status(models.TextChoices):
        ACTIVE     = 'ACTIVE',     'Active'
        ON_LEAVE   = 'ON_LEAVE',   'On Leave'
        TERMINATED = 'TERMINATED', 'Terminated'

    role   = models.CharField(max_length=20, choices=Role.choices, default=Role.TEACHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    phone_number  = models.CharField(max_length=20, blank=True)
    balance       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salary_share  = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="% of monthly class fee credited to teacher on charge"
    )

    def clean(self):
        if self.role == self.Role.DEV and not self.is_superuser:
            raise ValidationError("DEV role can only be assigned to a superuser account.")

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def display_name(self):
        return self.get_full_name() or self.username

    # Convenience helpers used in permission checks
    @property
    def is_ceo(self):   return self.role == self.Role.CEO
    @property
    def is_admin(self): return self.role == self.Role.ADMIN
    @property
    def is_teacher(self): return self.role == self.Role.TEACHER
