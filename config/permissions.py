from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsTeacherReadOnlyOrFullAccess(BasePermission):
    """
    - TEACHER role: GET/HEAD/OPTIONS only (safe methods)
    - CEO / ADMIN / DEV: full access
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'TEACHER':
            return request.method in SAFE_METHODS
        return True


class IsTeacherReadOnlyOrFullAccessOrAttendance(BasePermission):
    """
    Like IsTeacherReadOnly but also allows TEACHER to POST/PATCH/DELETE
    on the Attendance endpoint (their own class attendance records).
    Used by AttendanceViewSet.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Teachers can read AND write attendance
        role = getattr(request.user, 'role', None)
        if role == 'TEACHER':
            return True  # object-level filtering done in viewset
        return True

    def has_object_permission(self, request, view, obj):
        role = getattr(request.user, 'role', None)
        if role == 'TEACHER':
            # TEACHER can only modify attendance for their own classes
            return request.method in SAFE_METHODS or obj.course_class.teacher_id == request.user.id
        return True


class IsCEOOrDev(BasePermission):
    """Only CEO or DEV roles allowed."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['CEO', 'DEV']


class IsAdminOrCEOOrDev(BasePermission):
    """ADMIN, CEO, and DEV roles allowed."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['CEO', 'DEV', 'ADMIN']
