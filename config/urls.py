from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Returns the currently logged-in user's info for the frontend header."""
    u = request.user
    return Response({
        'id': u.id,
        'username': u.username,
        'display_name': u.get_full_name() or u.username,
        'role': u.role,
        'role_display': u.get_role_display(),
        'status': u.status,
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Current user
    path('api/me/', me_view),
    # App APIs
    path('api/', include('users.urls')),
    path('api/', include('students.urls')),
    path('api/', include('academics.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/reports/', include('reports.urls')),
]
