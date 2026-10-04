from rest_framework import serializers

from .models import Request


class RequestSerializer(serializers.ModelSerializer):

    request_type_name = serializers.CharField(
        source="request_type.name",
        read_only=True
    )

    class Meta:
        model = Request

        fields = [
            "id",
            "user",
            "request_type",
            "request_type_name",
            "title",
            "description",
            "attachment",
            "rejection_message",
            "status",
            "created_at",
            "updated_at",
            "action_deadline",
        ]

        read_only_fields = [
            "id",
            "user",
            "status",
            "created_at",
            "updated_at",
            "action_deadline",
            "request_type_name",
        ]