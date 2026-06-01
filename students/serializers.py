from rest_framework import serializers
from .models import Lead, Student

class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    class_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

    def get_class_details(self, obj):
        return [{'id': c.id, 'name': c.name, 'monthly_fee': float(c.monthly_fee)} for c in obj.classes.filter(is_archived=False)]
