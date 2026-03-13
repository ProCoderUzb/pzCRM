from django.contrib import admin
from .models import Payment, Expense

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'amount', 'date', 'method')
    list_filter = ('method', 'date')
    search_fields = ('student__full_name',)

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'date', 'category')
    list_filter = ('category', 'date')
    search_fields = ('title',)
