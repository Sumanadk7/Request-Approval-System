from rest_framework import serializers

from .models import Workflow, WorkflowAssignment

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
            "created_at",
        ]