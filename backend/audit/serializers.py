from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = AuditLog

        fields = [
            "id",
            "request",
            "user",
            "action",
            "message",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]