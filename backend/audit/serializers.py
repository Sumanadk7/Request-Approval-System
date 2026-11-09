from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):

    request_title = serializers.SerializerMethodField()
    request_type_name = serializers.SerializerMethodField()
    request_status = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.username if obj.user_id else None

    def get_request_title(self, obj):
        return obj.request.title if obj.request_id else None

    def get_request_type_name(self, obj):
        if not obj.request_id:
            return None
        return obj.request.request_type.name

    def get_request_status(self, obj):
        return obj.request.status if obj.request_id else None

    class Meta:
        model = AuditLog

        fields = [
            "id",
            "request",
            "request_title",
            "request_type_name",
            "request_status",
            "user",
            "user_name",
            "action",
            "message",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]
