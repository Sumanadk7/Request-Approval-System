from rest_framework import generics
from .models import (
    Request,
    RequestVerifierAction,
    RequestApproverAction
)
from .serializers import RequestSerializer

from accounts.permissions import (
    IsUser,
    IsVerifier,
    IsApprover,
    IsAssignedVerifier,
    IsAssignedApprover
)

from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied

from notifications.models import Notification

from django.utils import timezone
from datetime import timedelta


# =========================================================
# CREATE REQUEST
# =========================================================

class RequestCreateView(generics.CreateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):

        deadline = timezone.now() + timedelta(hours=24)

        serializer.save(
            user=self.request.user,
            action_deadline=deadline
        )


# =========================================================
# VERIFY REQUEST
# =========================================================

class RequestVerifyView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        # Request must be PENDING
        if request_obj.status != "PENDING":
            raise ValidationError(
                "Only PENDING requests can be verified."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # SEQUENTIAL VERIFIER
        # =====================================================

        if workflow.verifier_mode == "SEQUENTIAL":

            current_assignment = workflow.assignments.filter(
                role="VERIFIER",
                order=request_obj.current_verifier_order,
                is_active=True
            ).first()

            if not current_assignment:
                raise ValidationError(
                    "No active verifier is assigned for this step."
                )

            if current_assignment.user != self.request.user:
                raise PermissionDenied(
                    "You are not the assigned verifier for this step."
                )

            next_verifier = workflow.assignments.filter(
                role="VERIFIER",
                order__gt=request_obj.current_verifier_order,
                is_active=True
            ).order_by("order").first()

            # More verifier remaining
            if next_verifier:

                serializer.save(
                    current_verifier_order=next_verifier.order,
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been verified by verifier '
                        f'{current_assignment.user.username}. '
                        f'It is now waiting for the next verifier.'
                    )
                )

            # Verification completed
            else:

                serializer.save(
                    status="VERIFIED",
                    current_approver_order=1,
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully verified.'
                    )
                )

        # =====================================================
        # PARALLEL VERIFIER
        # =====================================================

        elif workflow.verifier_mode == "PARALLEL":

            current_assignment = workflow.assignments.filter(
                role="VERIFIER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an active verifier for this workflow."
                )

            # Check duplicate action
            already_acted = RequestVerifierAction.objects.filter(
                request=request_obj,
                verifier=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            # Record verifier action
            RequestVerifierAction.objects.create(
                request=request_obj,
                verifier=self.request.user,
                action="VERIFIED"
            )

            # Total active verifiers
            total_verifiers = workflow.assignments.filter(
                role="VERIFIER",
                is_active=True
            ).count()

            # Total completed verifier actions
            verified_verifiers = RequestVerifierAction.objects.filter(
                request=request_obj,
                action="VERIFIED"
            ).count()

            # All verifiers completed
            if verified_verifiers >= total_verifiers:

                serializer.save(
                    status="VERIFIED",
                    current_approver_order=1,
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully verified.'
                    )
                )

            # Verifiers still remaining
            else:

                serializer.save(
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been verified by '
                        f'{self.request.user.username}. '
                        f'It is waiting for the remaining verifiers.'
                    )
                )


# =========================================================
# VERIFIER REJECT
# =========================================================

class RequestVerifierRejectView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        if request_obj.status != "PENDING":
            raise ValidationError(
                "Only PENDING requests can be rejected by verifier."
            )

        serializer.save(
            status="REJECTED",
            action_deadline=None
        )

        Notification.objects.create(
            receiver=request_obj.user,
            message=(
                f'Your request "{request_obj.title}" '
                f'was rejected by the verifier. '
                f'Reason: {request_obj.rejection_message}'
            )
        )


# =========================================================
# APPROVE REQUEST
# =========================================================

class RequestApproveView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        # Request must be VERIFIED
        if request_obj.status != "VERIFIED":
            raise ValidationError(
                "Only VERIFIED requests can be approved."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # SEQUENTIAL APPROVER
        # =====================================================

        if workflow.approver_mode == "SEQUENTIAL":

            current_assignment = workflow.assignments.filter(
                role="APPROVER",
                order=request_obj.current_approver_order,
                is_active=True
            ).first()

            if not current_assignment:
                raise ValidationError(
                    "No active approver is assigned for this step."
                )

            if current_assignment.user != self.request.user:
                raise PermissionDenied(
                    "You are not the assigned approver for this step."
                )

            next_approver = workflow.assignments.filter(
                role="APPROVER",
                order__gt=request_obj.current_approver_order,
                is_active=True
            ).order_by("order").first()

            # More approvers remaining
            if next_approver:

                serializer.save(
                    current_approver_order=next_approver.order,
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been approved by approver '
                        f'{current_assignment.user.username}. '
                        f'It is now waiting for the next approver.'
                    )
                )

            # Final approval completed
            else:

                serializer.save(
                    status="APPROVED",
                    action_deadline=None
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully approved.'
                    )
                )

        # =====================================================
        # PARALLEL APPROVER
        # =====================================================

        elif workflow.approver_mode == "PARALLEL":

            current_assignment = workflow.assignments.filter(
                role="APPROVER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an active approver for this workflow."
                )

            # Check duplicate action
            already_acted = RequestApproverAction.objects.filter(
                request=request_obj,
                approver=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            # Record approver action
            RequestApproverAction.objects.create(
                request=request_obj,
                approver=self.request.user,
                action="APPROVED"
            )

            # Total active approvers
            total_approvers = workflow.assignments.filter(
                role="APPROVER",
                is_active=True
            ).count()

            # Total completed approval actions
            approved_approvers = RequestApproverAction.objects.filter(
                request=request_obj,
                action="APPROVED"
            ).count()

            # All approvers completed
            if approved_approvers >= total_approvers:

                serializer.save(
                    status="APPROVED",
                    action_deadline=None
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully approved.'
                    )
                )

            # Approvers still remaining
            else:

                serializer.save(
                    action_deadline=timezone.now() + timedelta(hours=24)
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been approved by '
                        f'{self.request.user.username}. '
                        f'It is waiting for the remaining approvers.'
                    )
                )


# =========================================================
# APPROVER REJECT
# =========================================================

class RequestRejectView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        if request_obj.status != "VERIFIED":
            raise ValidationError(
                "Only VERIFIED requests can be rejected by approver."
            )

        serializer.save(
            status="REJECTED",
            action_deadline=None
        )

        Notification.objects.create(
            receiver=request_obj.user,
            message=(
                f'Your request "{request_obj.title}" '
                f'was rejected by the approver. '
                f'Reason: {request_obj.rejection_message}'
            )
        )


# =========================================================
# REQUEST LIST
# =========================================================

class RequestListView(generics.ListAPIView):

    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        # Normal User
        if user.role == "USER":

            return Request.objects.filter(
                user=user
            ).order_by("-created_at")

        # Verifier
        elif user.role == "VERIFIER":

            return Request.objects.filter(
                status="PENDING",
                request_type__workflow__assignments__user=user,
                request_type__workflow__assignments__role="VERIFIER",
                request_type__workflow__assignments__is_active=True
            ).distinct().order_by("-created_at")

        # Approver
        elif user.role == "APPROVER":

            return Request.objects.filter(
                status="VERIFIED",
                request_type__workflow__assignments__user=user,
                request_type__workflow__assignments__role="APPROVER",
                request_type__workflow__assignments__is_active=True
            ).distinct().order_by("-created_at")

        return Request.objects.none()