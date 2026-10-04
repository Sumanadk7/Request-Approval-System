from rest_framework import serializers

from .models import Request


class RequestSerializer(serializers.ModelSerializer):

    request_type_name = serializers.CharField(
        source="request_type.name",
        read_only=True
    )

    created_by = serializers.CharField(
        source="user.username",
        read_only=True
    )

    current_verifier_username = serializers.SerializerMethodField()

    current_approver_username = serializers.SerializerMethodField()

    def get_current_verifier_username(self, obj):
        if obj.current_verifier_id and obj.current_verifier:
            return obj.current_verifier.username
        return None

    def get_current_approver_username(self, obj):
        if obj.current_approver_id and obj.current_approver:
            return obj.current_approver.username
        return None

    class Meta:
        model = Request

        fields = [
            "id",
            "user",
            "created_by",
            "request_type",
            "request_type_name",
            "title",
            "description",
            "attachment",
            "rejection_message",
            "status",
            "current_verifier",
            "current_verifier_username",
            "current_verifier_order",
            "current_approver",
            "current_approver_username",
            "current_approver_order",
            "created_at",
            "updated_at",
            "action_deadline",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_by",
            "status",
            "current_verifier",
            "current_verifier_username",
            "current_verifier_order",
            "current_approver",
            "current_approver_username",
            "current_approver_order",
            "created_at",
            "updated_at",
            "action_deadline",
            "request_type_name",
        ]