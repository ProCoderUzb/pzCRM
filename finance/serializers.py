from rest_framework import serializers
from .models import Payment, Expense, MonthlyCharge, MonthlyChargeEntry

class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class MonthlyChargeEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)

    class Meta:
        model = MonthlyChargeEntry
        fields = '__all__'

class MonthlyChargeSerializer(serializers.ModelSerializer):
    entries = MonthlyChargeEntrySerializer(many=True, read_only=True)
    class_name = serializers.CharField(source='course_class.name', read_only=True)
    charged_by_name = serializers.CharField(source='charged_by.username', read_only=True)

    class Meta:
        model = MonthlyCharge
        fields = '__all__'
