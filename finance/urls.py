from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, ExpenseViewSet, MonthlyChargeViewSet, FinanceSummaryView

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'charges', MonthlyChargeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', FinanceSummaryView.as_view(), name='finance_summary'),
]
