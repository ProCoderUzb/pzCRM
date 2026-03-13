from django.contrib import admin
from .models import Lead, Student

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('full_name', 'phone_number')

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'parent_name', 'is_active', 'joined_date')
    list_filter = ('is_active', 'joined_date')
    search_fields = ('full_name', 'phone_number', 'parent_name')
