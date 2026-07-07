from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, ExpenseViewSet, MonthlyChargeViewSet,
    FinanceSummaryView, TeacherSalaryView, PaySalaryView,
    ChargeAllGroupsView, TeacherDetailSalaryView,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'charges', MonthlyChargeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', FinanceSummaryView.as_view(), name='finance_summary'),
    path('teacher-salaries/', TeacherSalaryView.as_view(), name='teacher_salaries'),
    path('pay-salary/', PaySalaryView.as_view(), name='pay_salary'),
    path('charge-all-groups/', ChargeAllGroupsView.as_view(), name='charge_all_groups'),
    path('teacher-salary-detail/', TeacherDetailSalaryView.as_view(), name='teacher_salary_detail'),
]
