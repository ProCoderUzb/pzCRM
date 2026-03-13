from rest_framework import viewsets, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import User
from .serializers import UserSerializer, UserCreateSerializer


class UserViewSet(viewsets.ModelViewSet):
    # Never expose DEV accounts through the API
    queryset = User.objects.exclude(role='DEV').order_by('role', 'first_name', 'username')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'phone_number']

    def get_queryset(self):
        qs = super().get_queryset()
        # Support multiple ?role= params: ?role=TEACHER&role=ADMIN
        roles = self.request.query_params.getlist('role')
        if roles:
            qs = qs.filter(role__in=roles)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        # Only CEO/DEV can delete staff
        if request.user.role not in ['CEO', 'DEV']:
            return Response({'error': 'You do not have permission to delete staff.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        # Admin cannot change role or status
        if self.request.user.role == 'ADMIN':
            # Role/status are protected fields for Admin
            serializer.save(
                role=serializer.instance.role,
                status=serializer.instance.status
            )
        else:
            serializer.save()
