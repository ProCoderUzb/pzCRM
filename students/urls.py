from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, StudentViewSet

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'students', StudentViewSet)

urlpatterns = router.urls
