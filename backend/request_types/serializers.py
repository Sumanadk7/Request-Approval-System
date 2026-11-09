from rest_framework import serializers

from .models import RequestType


class RequestTypeSerializer(serializers.ModelSerializer):

    department_name = serializers.CharField(
        source="department.name",
        read_only=True
    )

    class Meta:
        model = RequestType

        fields = [
            "id",
            "name",
            "description",
            "department",
            "department_name",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]