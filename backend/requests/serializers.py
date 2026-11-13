from rest_framework import serializers

from django.utils import timezone

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

    is_editable = serializers.SerializerMethodField()

    request_type_description = serializers.CharField(
        source="request_type.description",
        read_only=True
    )

    department_name = serializers.CharField(
        source="request_type.department.name",
        read_only=True
    )

    workflow_verifier_mode = serializers.SerializerMethodField()

    workflow_approver_mode = serializers.SerializerMethodField()

    is_final_approver_step = serializers.SerializerMethodField()

    route = serializers.SerializerMethodField()

    workflow_stage = serializers.SerializerMethodField()

    def get_route(self, obj):
        if obj.status != "DRAFT" and obj.assignments.exists():
            assignments = obj.assignments.filter(
                is_active=True
            ).order_by("role", "order")
        else:
            workflow = getattr(obj.request_type, "workflow", None)

            if workflow is None or not workflow.is_active:
                return []

            assignments = workflow.assignments.filter(
                is_active=True
            ).order_by("role", "order")

        route = []

        for assignment in assignments:
            if assignment.user is None:
                continue

            route.append({
                "role": assignment.role,
                "order": assignment.order,
                "username": assignment.user.username,
            })

        return route

    def get_workflow_stage(self, obj):
        workflow = getattr(obj.request_type, "workflow", None)

        if obj.status == "DRAFT":
            return {
                "label": "Draft",
                "verifier_done": 0,
                "verifier_total": 0,
                "approver_done": 0,
                "approver_total": 0,
            }

        if workflow is None:
            return {
                "label": obj.status.title(),
                "verifier_done": 0,
                "verifier_total": 0,
                "approver_done": 0,
                "approver_total": 0,
            }

        verifier_total = obj.assignments.filter(
            role="VERIFIER",
            is_active=True,
        ).count()

        approver_total = obj.assignments.filter(
            role="APPROVER",
            is_active=True,
        ).count()

        if workflow.verifier_mode == "PARALLEL":
            verifier_done = obj.verifier_actions.filter(
                action="VERIFIED"
            ).values("verifier").distinct().count()
        else:
            verifier_done = max(
                obj.current_verifier_order - 1, 0
            )

        if workflow.approver_mode == "PARALLEL":
            approver_done = obj.approver_actions.filter(
                action="APPROVED"
            ).values("approver").distinct().count()
        else:
            approver_done = max(
                obj.current_approver_order - 1, 0
            )

        if obj.status == "REJECTED":
            label = "Rejected"
        elif obj.status == "APPROVED":
            verifier_done = verifier_total
            approver_done = approver_total
            label = "Approved - all steps completed"
        elif verifier_done < verifier_total:
            label = (
                f"Verification {verifier_done}/"
                f"{verifier_total}"
            )
        elif approver_done < approver_total:
            label = (
                f"Approval {approver_done}/{approver_total}"
            )
        else:
            label = "Completed"

        return {
            "label": label,
            "verifier_done": verifier_done,
            "verifier_total": verifier_total,
            "approver_done": approver_done,
            "approver_total": approver_total,
        }

    def get_is_final_approver_step(self, obj):
        if obj.status not in ["VERIFIED", "DECISION_REQUIRED"]:
            return False

        if obj.current_approver_id is None:
            return False

        workflow = getattr(obj.request_type, "workflow", None)

        if workflow is None:
            return False

        active_approvers = obj.assignments.filter(
            role="APPROVER",
            is_active=True
        )

        if workflow.approver_mode == "SEQUENTIAL":
            last_order = (
                active_approvers.order_by("-order")
                .values_list("order", flat=True)
                .first()
            )
            return (
                last_order is not None
                and obj.current_approver_order >= last_order
            )

        total_approvers = active_approvers.count()

        approved_approvers = (
            obj.approver_actions.filter(action="APPROVED")
            .values("approver")
            .distinct()
            .count()
        )

        return total_approvers - approved_approvers == 1

    def get_workflow_verifier_mode(self, obj):
        workflow = getattr(obj.request_type, "workflow", None)
        return workflow.verifier_mode if workflow else None

    def get_workflow_approver_mode(self, obj):
        workflow = getattr(obj.request_type, "workflow", None)
        return workflow.approver_mode if workflow else None

    def get_is_editable(self, obj):
        return (
            obj.status == "DRAFT"
            and obj.action_deadline is not None
            and obj.action_deadline > timezone.now()
        )

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
            "request_type_description",
            "department_name",
            "workflow_verifier_mode",
            "workflow_approver_mode",
            "is_final_approver_step",
            "route",
            "workflow_stage",
            "title",
            "description",
            "attachment",
            "rejection_message",
            "verification_message",
            "approval_message",
            "status",
            "is_editable",
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
            "is_editable",
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
            "request_type_description",
            "department_name",
            "workflow_verifier_mode",
            "workflow_approver_mode",
            "is_final_approver_step",
            "route",
            "workflow_stage",
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