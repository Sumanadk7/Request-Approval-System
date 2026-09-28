from rest_framework import generics

from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import (
    Workflow,
    WorkflowAssignment,
    WorkflowAssignmentHistory
)

from .serializers import (
    WorkflowSerializer,
    WorkflowAssignmentSerializer,
    WorkflowAssignmentReassignSerializer
)

from .permissions import IsAdmin

from accounts.models import User

from audit.models import AuditLog


# =========================================================
# WORKFLOW LIST / CREATE
# =========================================================

class WorkflowListCreateView(generics.ListCreateAPIView):

    queryset = Workflow.objects.all().order_by("request_type")
    serializer_class = WorkflowSerializer
    permission_classes = [IsAdmin]


# =========================================================
# WORKFLOW DETAIL
# =========================================================

class WorkflowDetailView(generics.RetrieveUpdateDestroyAPIView):

    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAdmin]


# =========================================================
# WORKFLOW ASSIGNMENT LIST / CREATE
# =========================================================

class WorkflowAssignmentListCreateView(generics.ListCreateAPIView):

    serializer_class = WorkflowAssignmentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        workflow_id = self.kwargs["workflow_id"]

        return WorkflowAssignment.objects.filter(
            workflow_id=workflow_id
        ).order_by("role", "order")

    def perform_create(self, serializer):

        workflow_id = self.kwargs["workflow_id"]

        # =====================================================
        # CHECK WORKFLOW
        # =====================================================

        try:

            workflow = Workflow.objects.get(
                id=workflow_id
            )

        except Workflow.DoesNotExist:

            raise ValidationError(
                "Workflow does not exist."
            )

        # =====================================================
        # GET DATA
        # =====================================================

        user_id = self.request.data.get("user")
        role = self.request.data.get("role")
        order = self.request.data.get("order", 1)

        # =====================================================
        # CHECK USER
        # =====================================================

        if not user_id:

            raise ValidationError(
                "User is required."
            )

        try:

            user_id = int(user_id)

        except (TypeError, ValueError):

            raise ValidationError(
                "User ID must be a valid number."
            )

        try:

            user = User.objects.get(
                id=user_id,
                is_active=True
            )

        except User.DoesNotExist:

            raise ValidationError(
                "User does not exist or is inactive."
            )

        # =====================================================
        # CHECK ROLE
        # =====================================================

        if role not in ["VERIFIER", "APPROVER"]:

            raise ValidationError(
                "Role must be VERIFIER or APPROVER."
            )

        # =====================================================
        # CHECK USER ROLE
        # =====================================================

        if role == "VERIFIER" and user.role != "VERIFIER":

            raise ValidationError(
                "Only a VERIFIER user can be assigned "
                "to a verifier position."
            )

        if role == "APPROVER" and user.role != "APPROVER":

            raise ValidationError(
                "Only an APPROVER user can be assigned "
                "to an approver position."
            )

        # =====================================================
        # CHECK ORDER
        # =====================================================

        try:

            order = int(order)

        except (TypeError, ValueError):

            raise ValidationError(
                "Order must be a valid number."
            )

        if order < 1:

            raise ValidationError(
                "Order must be greater than or equal to 1."
            )

        # =====================================================
        # CHECK DUPLICATE ACTIVE ASSIGNMENT
        # =====================================================

        duplicate_assignment = WorkflowAssignment.objects.filter(
            workflow=workflow,
            user=user,
            role=role,
            order=order,
            is_active=True
        ).exists()

        if duplicate_assignment:

            raise ValidationError(
                "This user is already assigned to this "
                "workflow position."
            )

        # =====================================================
        # CREATE ASSIGNMENT
        # =====================================================

        serializer.save(
            workflow=workflow,
            user=user,
            role=role,
            order=order,
            is_active=True
        )


# =========================================================
# WORKFLOW ASSIGNMENT REASSIGN
# =========================================================

class WorkflowAssignmentReassignView(generics.UpdateAPIView):

    queryset = WorkflowAssignment.objects.all()
    serializer_class = WorkflowAssignmentReassignSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):

        assignment = self.get_object()

        old_user = assignment.user

        new_user_id = self.request.data.get("user")

        # =====================================================
        # CHECK USER ID
        # =====================================================

        if not new_user_id:

            raise ValidationError(
                "New user is required."
            )

        try:

            new_user_id = int(new_user_id)

        except (TypeError, ValueError):

            raise ValidationError(
                "User ID must be a valid number."
            )

        # =====================================================
        # GET NEW USER
        # =====================================================

        try:

            new_user = User.objects.get(
                id=new_user_id,
                is_active=True
            )

        except User.DoesNotExist:

            raise ValidationError(
                "User does not exist or is inactive."
            )

        # =====================================================
        # CHECK SAME USER
        # =====================================================

        if assignment.user_id == new_user.id:

            raise ValidationError(
                "This user is already assigned."
            )

        # =====================================================
        # CHECK USER ROLE
        # =====================================================

        if assignment.role == "VERIFIER":

            if new_user.role != "VERIFIER":

                raise ValidationError(
                    "Only a VERIFIER user can be assigned "
                    "to a verifier position."
                )

        elif assignment.role == "APPROVER":

            if new_user.role != "APPROVER":

                raise ValidationError(
                    "Only an APPROVER user can be assigned "
                    "to an approver position."
                )

        # =====================================================
        # CHECK DUPLICATE ACTIVE ASSIGNMENT
        # =====================================================

        duplicate_assignment = WorkflowAssignment.objects.filter(
            workflow=assignment.workflow,
            user=new_user,
            role=assignment.role,
            order=assignment.order,
            is_active=True
        ).exists()

        if duplicate_assignment:

            raise ValidationError(
                "This user is already assigned to this "
                "workflow position."
            )

        # =====================================================
        # SAVE OLD ASSIGNMENT TO HISTORY
        # =====================================================

        WorkflowAssignmentHistory.objects.create(
            workflow=assignment.workflow,
            user=old_user,
            role=assignment.role,
            order=assignment.order,
            assigned_until=timezone.now()
        )

        # =====================================================
        # DEACTIVATE OLD ASSIGNMENT
        # =====================================================

        assignment.is_active = False

        assignment.save(
            update_fields=["is_active"]
        )

        # =====================================================
        # CREATE NEW ASSIGNMENT
        # =====================================================

        new_assignment = WorkflowAssignment.objects.create(
            workflow=assignment.workflow,
            user=new_user,
            role=assignment.role,
            order=assignment.order,
            is_active=True
        )

        # =====================================================
        # CREATE AUDIT LOG
        # =====================================================

        AuditLog.objects.create(
            workflow=assignment.workflow,
            user=self.request.user,
            action="REASSIGNED",
            message=(
                f"Workflow assignment reassigned from "
                f"{old_user.username} to "
                f"{new_user.username}. "
                f"Role: {assignment.role}, "
                f"Order: {assignment.order}."
            )
        )

        # =====================================================
        # RETURN NEW ASSIGNMENT
        # =====================================================

        serializer.instance = new_assignment