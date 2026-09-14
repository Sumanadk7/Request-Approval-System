from rest_framework import serializers

from .models import RequestType


class RequestTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = RequestType

        fields = [
            "id",
            "name",
            "description",
            "department",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]