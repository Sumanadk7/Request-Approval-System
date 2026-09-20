from rest_framework import generics
from .models import Request, RequestVerifierAction
from .serializers import RequestSerializer

from accounts.permissions import (
    IsUser,
    IsVerifier,
    IsApprover,
    IsAssignedVerifier,
    IsAssignedApprover
)

from rest_framework.permissions import IsAuthenticated
from notifications.models import Notification


class RequestCreateView(generics.CreateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class RequestVerifyView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        # Request must be PENDING
        if request_obj.status != "PENDING":
            from rest_framework.exceptions import ValidationError

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
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    "No active verifier is assigned for this step."
                )

            if current_assignment.user != self.request.user:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "You are not the assigned verifier for this step."
                )

            next_verifier = workflow.assignments.filter(
                role="VERIFIER",
                order__gt=request_obj.current_verifier_order,
                is_active=True
            ).order_by("order").first()

            if next_verifier:

                serializer.save(
                    current_verifier_order=next_verifier.order
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

            else:

                serializer.save(
                    status="VERIFIED",
                    current_approver_order=1
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
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "You are not an active verifier for this workflow."
                )

            # Check whether this verifier already acted
            already_acted = RequestVerifierAction.objects.filter(
                request=request_obj,
                verifier=self.request.user
            ).exists()

            if already_acted:
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    "You have already acted on this request."
                )

            # Record this verifier's action
            RequestVerifierAction.objects.create(
                request=request_obj,
                verifier=self.request.user,
                action="VERIFIED"
            )

            # Count all active verifiers
            total_verifiers = workflow.assignments.filter(
                role="VERIFIER",
                is_active=True
            ).count()

            # Count verifiers who already verified
            verified_verifiers = RequestVerifierAction.objects.filter(
                request=request_obj,
                action="VERIFIED"
            ).count()

            if verified_verifiers >= total_verifiers:

                serializer.save(
                    status="VERIFIED",
                    current_approver_order=1
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully verified.'
                    )
                )

            else:

                serializer.save()

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been verified by '
                        f'{self.request.user.username}. '
                        f'It is waiting for the remaining verifiers.'
                    )
                )

class RequestVerifierRejectView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def perform_update(self, serializer):

        if self.get_object().status != "PENDING":
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Only PENDING requests can be rejected by verifier."
            )

        serializer.save(
            status="REJECTED"
        )

        Notification.objects.create(
            receiver=self.get_object().user,
            message=(
                f'Your request "{self.get_object().title}" '
                f'was rejected by the verifier. '
                f'Reason: {self.get_object().rejection_message}'
            )
        )


class RequestApproveView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def perform_update(self, serializer):

        request_obj = self.get_object()

        # Request must be VERIFIED
        if request_obj.status != "VERIFIED":
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Only VERIFIED requests can be approved."
            )

        # Get current approver assignment
        current_assignment = request_obj.request_type.workflow.assignments.filter(
            role="APPROVER",
            order=request_obj.current_approver_order,
            is_active=True
        ).first()

        # Check if current approver exists
        if not current_assignment:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "No active approver is assigned for this step."
            )

        # Check whether logged-in user is the current approver
        if current_assignment.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "You are not the assigned approver for this step."
            )

        # Find next approver
        next_approver = request_obj.request_type.workflow.assignments.filter(
            role="APPROVER",
            order__gt=request_obj.current_approver_order,
            is_active=True
        ).order_by("order").first()

        if next_approver:

            # More approvers are remaining
            serializer.save(
                current_approver_order=next_approver.order
            )

            Notification.objects.create(
                receiver=request_obj.user,
                message=(
                    f'Your request "{request_obj.title}" '
                    f'has been approved by approver '
                    f'{request_obj.current_approver_order}. '
                    f'It is now waiting for the next approver.'
                )
            )

        else:

            # No approver remaining
            serializer.save(
                status="APPROVED"
            )

            Notification.objects.create(
                receiver=request_obj.user,
                message=(
                    f'Your request "{request_obj.title}" '
                    f'has been fully approved.'
                )
            )

class RequestRejectView(generics.UpdateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def perform_update(self, serializer):

        if self.get_object().status != "VERIFIED":
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Only VERIFIED requests can be rejected by approver."
            )

        serializer.save(
            status="REJECTED"
        )

        Notification.objects.create(
            receiver=self.get_object().user,
            message=(
                f'Your request "{self.get_object().title}" '
                f'was rejected by the approver. '
                f'Reason: {self.get_object().rejection_message}'
            )
        )


class RequestListView(generics.ListAPIView):
    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "USER":
            return Request.objects.filter(
                user=user
            )

        elif user.role == "VERIFIER":
            return Request.objects.filter(
                status="PENDING",
                request_type__workflow__assignments__user=user,
                request_type__workflow__assignments__role="VERIFIER",
                request_type__workflow__assignments__is_active=True
            ).distinct()

        elif user.role == "APPROVER":
            return Request.objects.filter(
                status="VERIFIED",
                request_type__workflow__assignments__user=user,
                request_type__workflow__assignments__role="APPROVER",
                request_type__workflow__assignments__is_active=True
            ).distinct()

        return Request.objects.none()