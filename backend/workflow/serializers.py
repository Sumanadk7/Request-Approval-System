from rest_framework import serializers

from .models import (
    Workflow,
    WorkflowAssignment,
    WorkflowAssignmentHistory
)


# =========================================================
# WORKFLOW SERIALIZER
# =========================================================

class WorkflowSerializer(serializers.ModelSerializer):

    class Meta:

        model = Workflow

        fields = [
            "id",
            "request_type",
            "verifier_mode",
            "approver_mode",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# WORKFLOW ASSIGNMENT SERIALIZER
# =========================================================

class WorkflowAssignmentSerializer(serializers.ModelSerializer):

    class Meta:

        model = WorkflowAssignment

        fields = [
            "id",
            "workflow",
            "user",
            "role",
            "order",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "workflow",
            "is_active",
            "created_at",
        ]


# =========================================================
# WORKFLOW ASSIGNMENT HISTORY SERIALIZER
# =========================================================

class WorkflowAssignmentHistorySerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = WorkflowAssignmentHistory

        fields = [
            "id",
            "workflow",
            "user",
            "role",
            "order",
            "assigned_from",
            "assigned_until",
        ]

        read_only_fields = [
            "id",
            "assigned_from",
            "assigned_until",
        ]


# =========================================================
# WORKFLOW ASSIGNMENT REASSIGN SERIALIZER
# =========================================================

class WorkflowAssignmentReassignSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = WorkflowAssignment

        fields = [
            "user",
        ]