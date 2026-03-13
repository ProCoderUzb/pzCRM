from django.urls import path
from .views import (
    AuditLogView,
    ExportStudentsView, ExportLeadsView, ExportPaymentsView,
    ExportExpensesView, ExportAttendanceView,
    ImportStudentsView, ImportLeadsView,
    AttendanceStatsView,
)

urlpatterns = [
    path('history/',              AuditLogView.as_view(),             name='audit-log'),
    path('export/students/',      ExportStudentsView.as_view(),       name='export-students'),
    path('export/leads/',         ExportLeadsView.as_view(),          name='export-leads'),
    path('export/payments/',      ExportPaymentsView.as_view(),       name='export-payments'),
    path('export/expenses/',      ExportExpensesView.as_view(),       name='export-expenses'),
    path('export/attendance/',    ExportAttendanceView.as_view(),     name='export-attendance'),
    path('import/students/',      ImportStudentsView.as_view(),       name='import-students'),
    path('import/leads/',         ImportLeadsView.as_view(),          name='import-leads'),
    path('attendance-stats/',     AttendanceStatsView.as_view(),      name='attendance-stats'),
]
