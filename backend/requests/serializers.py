from rest_framework import serializers
from .models import Request


class RequestSerializer(serializers.ModelSerializer):

    class Meta:
        model = Request
        fields = [
            "id",
            "user",
            "title",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "status",
            "created_at",
            "updated_at",
        ]