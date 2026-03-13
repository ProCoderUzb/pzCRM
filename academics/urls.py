from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, RoomViewSet, CourseClassViewSet, AttendanceViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'classes', CourseClassViewSet)
router.register(r'attendance', AttendanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
]
