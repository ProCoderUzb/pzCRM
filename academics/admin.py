from django.contrib import admin
from .models import Subject, Room, CourseClass, Attendance

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'capacity')
    search_fields = ('name',)

@admin.register(CourseClass)
class CourseClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'teacher', 'room', 'capacity')
    list_filter = ('subject', 'teacher', 'room')
    search_fields = ('name', 'subject__name')
    filter_horizontal = ('students',)

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'course_class', 'date', 'status')
    list_filter = ('date', 'status', 'course_class')
    search_fields = ('student__full_name',)
