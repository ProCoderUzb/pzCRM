"""
Signal handlers that auto-populate the AuditLog whenever key models
are created, updated, or deleted.

We use a thread-local to store the current request user, set by
AuditLogMiddleware, so signals don't need the request object passed in.
"""
import threading
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import AuditLog

_thread_locals = threading.local()


def get_current_user():
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    _thread_locals.user = user


# ─── Models to audit ──────────────────────────────────────────────────────────
from students.models import Student, Lead
from academics.models import CourseClass, Attendance
from finance.models import Payment, Expense
from users.models import User as StaffUser

AUDITED_MODELS = [Student, Lead, CourseClass, Attendance, Payment, Expense, StaffUser]

# Store pre-save snapshot per instance (keyed by (model, pk))
_pre_save_snapshots: dict = {}


def _snapshot(instance):
    """Return a dict of field_name → str(value) for an instance."""
    snapshot = {}
    for field in instance._meta.concrete_fields:
        try:
            snapshot[field.name] = str(getattr(instance, field.name))
        except Exception:
            snapshot[field.name] = ''
    return snapshot


def _diff(before: dict, after: dict) -> dict:
    """Return only the fields that changed, as {field: {old, new}}."""
    changes = {}
    for key in after:
        if key in ('id', 'created_at', 'updated_at'):
            continue
        if before.get(key) != after.get(key):
            changes[key] = {'old': before.get(key, ''), 'new': after.get(key, '')}
    return changes


def connect_audit_signals():
    for Model in AUDITED_MODELS:
        pre_save.connect(_pre_save_handler, sender=Model)
        post_save.connect(_post_save_handler, sender=Model)
        post_delete.connect(_post_delete_handler, sender=Model)


def _pre_save_handler(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _pre_save_snapshots[(sender, instance.pk)] = _snapshot(old)
        except sender.DoesNotExist:
            pass


def _post_save_handler(sender, instance, created, **kwargs):
    user = get_current_user()
    model_name = sender.__name__
    key = (sender, instance.pk)

    if created:
        AuditLog.objects.create(
            user=user,
            action='CREATE',
            model_name=model_name,
            object_id=instance.pk,
            object_repr=str(instance),
            changes={},
        )
    else:
        before = _pre_save_snapshots.pop(key, {})
        after = _snapshot(instance)
        changes = _diff(before, after)
        if changes:
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                model_name=model_name,
                object_id=instance.pk,
                object_repr=str(instance),
                changes=changes,
            )


def _post_delete_handler(sender, instance, **kwargs):
    user = get_current_user()
    AuditLog.objects.create(
        user=user,
        action='DELETE',
        model_name=sender.__name__,
        object_id=instance.pk,
        object_repr=str(instance),
        changes={},
    )
