from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'status', 'phone_number', 'balance', 'salary_share', 'display_name')
        read_only_fields = ('id', 'balance', 'display_name')

    def get_display_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_role(self, value):
        # Prevent assigning DEV role via the API
        if value == 'DEV':
            raise serializers.ValidationError("DEV role cannot be assigned via the CRM.")
        # Prevent assigning CEO role if one already exists (edit exempt)
        if value == 'CEO':
            qs = User.objects.filter(role='CEO')
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Only one CEO can exist in the system.")
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    display_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'status', 'phone_number', 'salary_share', 'password', 'display_name')
        read_only_fields = ('id', 'display_name')

    def get_display_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_role(self, value):
        if value == 'DEV':
            raise serializers.ValidationError("DEV role cannot be assigned via the CRM.")
        if value == 'CEO':
            if User.objects.filter(role='CEO').exists():
                raise serializers.ValidationError("Only one CEO can exist in the system.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
