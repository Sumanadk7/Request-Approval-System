from rest_framework import serializers

from audit.serializers import AuditLogSerializer

from .models import (
    Request,
    RequestAssignment,
    RequestVerifierAction,
    RequestApproverAction,
)


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
            "verification_message",
            "approval_message",
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
            "rejection_message",
            "verification_message",
            "approval_message",
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


class RequestAssignmentSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()

    def get_username(self, obj):
        if obj.user_id and obj.user:
            return obj.user.username
        return None

    class Meta:
        model = RequestAssignment
        fields = [
            "id",
            "user",
            "username",
            "role",
            "order",
            "is_active",
            "assigned_at",
        ]
        read_only_fields = fields


class RequestVerifierActionSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="verifier.username",
        read_only=True
    )

    class Meta:
        model = RequestVerifierAction
        fields = [
            "id",
            "verifier",
            "username",
            "action",
            "created_at",
        ]
        read_only_fields = fields


class RequestApproverActionSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="approver.username",
        read_only=True
    )

    class Meta:
        model = RequestApproverAction
        fields = [
            "id",
            "approver",
            "username",
            "action",
            "created_at",
        ]
        read_only_fields = fields


class RequestDetailSerializer(RequestSerializer):

    assignments = RequestAssignmentSerializer(
        many=True,
        read_only=True
    )

    verifier_actions = RequestVerifierActionSerializer(
        many=True,
        read_only=True
    )

    approver_actions = RequestApproverActionSerializer(
        many=True,
        read_only=True
    )

    audit_logs = AuditLogSerializer(
        many=True,
        read_only=True
    )

    class Meta(RequestSerializer.Meta):
        fields = RequestSerializer.Meta.fields + [
            "assignments",
            "verifier_actions",
            "approver_actions",
            "audit_logs",
        ]