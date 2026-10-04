
from rest_framework import generics

from .models import (
    Request,
    RequestVerifierAction,
    RequestApproverAction,
    RequestAssignment
)

from .serializers import RequestSerializer

from accounts.permissions import (
    IsUser,
    IsAssignedVerifier,
    IsAssignedApprover
)

from rest_framework.permissions import IsAuthenticated

from rest_framework.exceptions import (
    ValidationError,
    PermissionDenied
)

from notifications.models import Notification

from django.utils import timezone

from datetime import timedelta

from audit.models import AuditLog

from audit.serializers import AuditLogSerializer


# =========================================================
# CREATE REQUEST
# =========================================================

class RequestCreateView(generics.CreateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        deadline = timezone.now() + timedelta(hours=24)

        request_type = serializer.validated_data["request_type"]
        workflow = request_type.workflow

        # -----------------------------------------
        # FIRST VERIFIER
        # -----------------------------------------

        first_verifier = workflow.assignments.filter(
            role="VERIFIER",
            order=1,
            is_active=True
        ).first()

        # -----------------------------------------
        # CREATE REQUEST
        # -----------------------------------------

        request_obj = serializer.save(
            user=self.request.user,
            current_verifier=(
                first_verifier.user
                if first_verifier
                else None
            ),
            current_verifier_order=1,
            current_approver=None,
            current_approver_order=1,
            action_deadline=deadline,
            deadline_alert_sent=False
        )

        # =====================================================
        # VERIFIER ASSIGNMENT SNAPSHOT
        # =====================================================

        verifier_assignments = workflow.assignments.filter(
            role="VERIFIER",
            is_active=True
        )

        for assignment in verifier_assignments:
            RequestAssignment.objects.create(
                request=request_obj,
                user=assignment.user,
                role="VERIFIER",
                order=assignment.order
            )

        # =====================================================
        # APPROVER ASSIGNMENT SNAPSHOT
        # =====================================================

        approver_assignments = workflow.assignments.filter(
            role="APPROVER",
            is_active=True
        )

        for assignment in approver_assignments:
            RequestAssignment.objects.create(
                request=request_obj,
                user=assignment.user,
                role="APPROVER",
                order=assignment.order
            )

        # =====================================================
        # AUDIT
        # =====================================================

        AuditLog.objects.create(
            request=request_obj,
            user=self.request.user,
            action="CREATED",
            message="Request created."
        )


# =========================================================
# VERIFY REQUEST
# =========================================================

class RequestVerifyView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def get_serializer(self, *args, **kwargs):
        kwargs["partial"] = True

        return super().get_serializer(
            *args,
            **kwargs
        )

    def perform_update(self, serializer):
        request_obj = self.get_object()

        # =====================================================
        # STATUS CHECK
        # =====================================================

        if request_obj.status not in [
            "PENDING",
            "DECISION_REQUIRED"
        ]:
            raise ValidationError(
                "Only PENDING or DECISION_REQUIRED requests "
                "can be verified."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # SEQUENTIAL VERIFIER
        # =====================================================

        if workflow.verifier_mode == "SEQUENTIAL":

            current_assignment = request_obj.assignments.filter(
                role="VERIFIER",
                order=request_obj.current_verifier_order,
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not the assigned verifier for this step."
                )

            # -----------------------------------------
            # FIND NEXT VERIFIER
            # -----------------------------------------

            next_verifier = request_obj.assignments.filter(
                role="VERIFIER",
                order__gt=request_obj.current_verifier_order,
                is_active=True
            ).order_by("order").first()

            # -----------------------------------------
            # MOVE TO NEXT VERIFIER
            # -----------------------------------------

            if next_verifier:

                serializer.save(
                    status="PENDING",
                    current_verifier=next_verifier.user,
                    current_verifier_order=next_verifier.order,
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="VERIFIED",
                    message=(
                        f"Request verified by "
                        f"{self.request.user.username}. "
                        f"Moved to next verifier."
                    )
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

            # -----------------------------------------
            # ALL VERIFIERS COMPLETED
            # -----------------------------------------

            else:

                first_approver = request_obj.assignments.filter(
                    role="APPROVER",
                    order=1,
                    is_active=True
                ).first()

                serializer.save(
                    status="VERIFIED",
                    current_verifier=None,
                    current_approver=(
                        first_approver.user
                        if first_approver
                        else None
                    ),
                    current_approver_order=1,
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="VERIFIED",
                    message="Request fully verified."
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

            current_assignment = request_obj.assignments.filter(
                role="VERIFIER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an assigned verifier "
                    "for this request."
                )

            # -----------------------------------------
            # CHECK PREVIOUS ACTION
            # -----------------------------------------

            already_acted = RequestVerifierAction.objects.filter(
                request=request_obj,
                verifier=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            # -----------------------------------------
            # SAVE VERIFIER ACTION
            # -----------------------------------------

            RequestVerifierAction.objects.create(
                request=request_obj,
                verifier=self.request.user,
                action="VERIFIED"
            )

            # -----------------------------------------
            # TOTAL VERIFIERS
            # -----------------------------------------

            total_verifiers = request_obj.assignments.filter(
                role="VERIFIER",
                is_active=True
            ).count()

            verified_verifiers = (
                RequestVerifierAction.objects.filter(
                    request=request_obj,
                    action="VERIFIED"
                ).count()
            )

            # -----------------------------------------
            # ALL VERIFIERS COMPLETED
            # -----------------------------------------

            if verified_verifiers >= total_verifiers:

                first_approver = request_obj.assignments.filter(
                    role="APPROVER",
                    order=1,
                    is_active=True
                ).first()

                serializer.save(
                    status="VERIFIED",
                    current_verifier=None,
                    current_approver=(
                        first_approver.user
                        if first_approver
                        else None
                    ),
                    current_approver_order=1,
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="VERIFIED",
                    message=(
                        f"Verifier "
                        f"{self.request.user.username} "
                        f"completed verification. "
                        f"All verifiers have verified "
                        f"the request."
                    )
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully verified.'
                    )
                )

            # -----------------------------------------
            # VERIFIERS STILL REMAIN
            # -----------------------------------------

            else:

                serializer.save(
                    status="PENDING",
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="VERIFIED",
                    message=(
                        f"Verifier "
                        f"{self.request.user.username} "
                        f"verified the request. "
                        f"Waiting for remaining verifiers."
                    )
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been verified by '
                        f'{self.request.user.username}. '
                        f'It is waiting for the remaining '
                        f'verifiers.'
                    )
                )


# =========================================================
# VERIFIER REJECT
# =========================================================

class RequestVerifierRejectView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedVerifier]

    def get_serializer(self, *args, **kwargs):
        kwargs["partial"] = True

        return super().get_serializer(
            *args,
            **kwargs
        )

    def perform_update(self, serializer):
        request_obj = self.get_object()

        # =====================================================
        # STATUS CHECK
        # =====================================================

        if request_obj.status not in [
            "PENDING",
            "DECISION_REQUIRED"
        ]:
            raise ValidationError(
                "Only PENDING or DECISION_REQUIRED requests "
                "can be rejected by verifier."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # REJECTION REASON CHECK
        # =====================================================

        rejection_message = self.request.data.get(
            "rejection_message"
        )

        if not rejection_message or not rejection_message.strip():
            raise ValidationError(
                "Rejection reason is required."
            )

        # =====================================================
        # SEQUENTIAL VERIFIER
        # =====================================================

        if workflow.verifier_mode == "SEQUENTIAL":

            current_assignment = request_obj.assignments.filter(
                role="VERIFIER",
                order=request_obj.current_verifier_order,
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not the assigned verifier for this step."
                )

        # =====================================================
        # PARALLEL VERIFIER
        # =====================================================

        elif workflow.verifier_mode == "PARALLEL":

            current_assignment = request_obj.assignments.filter(
                role="VERIFIER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an assigned verifier "
                    "for this request."
                )

            already_acted = RequestVerifierAction.objects.filter(
                request=request_obj,
                verifier=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            RequestVerifierAction.objects.create(
                request=request_obj,
                verifier=self.request.user,
                action="REJECTED"
            )

        # =====================================================
        # REJECT REQUEST
        # =====================================================

        serializer.save(
            status="REJECTED",
            rejection_message=rejection_message.strip(),
            action_deadline=None
        )

        # =====================================================
        # AUDIT
        # =====================================================

        AuditLog.objects.create(
            request=request_obj,
            user=self.request.user,
            action="REJECTED",
            message=(
                f"Request rejected by verifier "
                f"{self.request.user.username}. "
                f"Reason: {rejection_message.strip()}"
            )
        )

        # =====================================================
        # NOTIFICATION
        # =====================================================

        Notification.objects.create(
            receiver=request_obj.user,
            message=(
                f'Your request "{request_obj.title}" '
                f'was rejected by the verifier. '
                f'Reason: {rejection_message.strip()}'
            )
        )


# =========================================================
# APPROVE REQUEST
# =========================================================

class RequestApproveView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def get_serializer(self, *args, **kwargs):
        kwargs["partial"] = True

        return super().get_serializer(
            *args,
            **kwargs
        )

    def perform_update(self, serializer):
        request_obj = self.get_object()

        # =====================================================
        # STATUS CHECK
        # =====================================================

        if request_obj.status not in [
            "VERIFIED",
            "DECISION_REQUIRED"
        ]:
            raise ValidationError(
                "Only VERIFIED or DECISION_REQUIRED requests "
                "can be approved."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # SEQUENTIAL APPROVER
        # =====================================================

        if workflow.approver_mode == "SEQUENTIAL":

            current_assignment = request_obj.assignments.filter(
                role="APPROVER",
                order=request_obj.current_approver_order,
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not the assigned approver for this step."
                )

            # -----------------------------------------
            # FIND NEXT APPROVER
            # -----------------------------------------

            next_approver = request_obj.assignments.filter(
                role="APPROVER",
                order__gt=request_obj.current_approver_order,
                is_active=True
            ).order_by("order").first()

            # -----------------------------------------
            # MOVE TO NEXT APPROVER
            # -----------------------------------------

            if next_approver:

                serializer.save(
                    status="VERIFIED",
                    current_approver=next_approver.user,
                    current_approver_order=next_approver.order,
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="APPROVED",
                    message=(
                        f"Request approved by "
                        f"{self.request.user.username}. "
                        f"Moved to next approver."
                    )
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

            # -----------------------------------------
            # ALL APPROVERS COMPLETED
            # -----------------------------------------

            else:

                serializer.save(
                    status="APPROVED",
                    current_approver=None,
                    action_deadline=None,
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="APPROVED",
                    message="Request fully approved."
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

            current_assignment = request_obj.assignments.filter(
                role="APPROVER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an assigned approver "
                    "for this request."
                )

            # -----------------------------------------
            # CHECK PREVIOUS ACTION
            # -----------------------------------------

            already_acted = RequestApproverAction.objects.filter(
                request=request_obj,
                approver=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            # -----------------------------------------
            # SAVE APPROVER ACTION
            # -----------------------------------------

            RequestApproverAction.objects.create(
                request=request_obj,
                approver=self.request.user,
                action="APPROVED"
            )

            # -----------------------------------------
            # TOTAL APPROVERS
            # -----------------------------------------

            total_approvers = request_obj.assignments.filter(
                role="APPROVER",
                is_active=True
            ).count()

            approved_approvers = (
                RequestApproverAction.objects.filter(
                    request=request_obj,
                    action="APPROVED"
                ).count()
            )

            # -----------------------------------------
            # ALL APPROVERS COMPLETED
            # -----------------------------------------

            if approved_approvers >= total_approvers:

                serializer.save(
                    status="APPROVED",
                    current_approver=None,
                    action_deadline=None,
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="APPROVED",
                    message=(
                        f"Approver "
                        f"{self.request.user.username} "
                        f"completed approval. "
                        f"All approvers have approved "
                        f"the request."
                    )
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been fully approved.'
                    )
                )

            # -----------------------------------------
            # APPROVERS STILL REMAIN
            # -----------------------------------------

            else:

                serializer.save(
                    status="VERIFIED",
                    action_deadline=(
                        timezone.now() +
                        timedelta(hours=24)
                    ),
                    deadline_alert_sent=False
                )

                AuditLog.objects.create(
                    request=request_obj,
                    user=self.request.user,
                    action="APPROVED",
                    message=(
                        f"Approver "
                        f"{self.request.user.username} "
                        f"approved the request. "
                        f"Waiting for remaining approvers."
                    )
                )

                Notification.objects.create(
                    receiver=request_obj.user,
                    message=(
                        f'Your request "{request_obj.title}" '
                        f'has been approved by '
                        f'{self.request.user.username}. '
                        f'It is waiting for the remaining '
                        f'approvers.'
                    )
                )


# =========================================================
# APPROVER REJECT
# =========================================================

class RequestRejectView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAssignedApprover]

    def get_serializer(self, *args, **kwargs):
        kwargs["partial"] = True

        return super().get_serializer(
            *args,
            **kwargs
        )

    def perform_update(self, serializer):
        request_obj = self.get_object()

        # =====================================================
        # STATUS CHECK
        # =====================================================

        if request_obj.status not in [
            "VERIFIED",
            "DECISION_REQUIRED"
        ]:
            raise ValidationError(
                "Only VERIFIED or DECISION_REQUIRED requests "
                "can be rejected by approver."
            )

        workflow = request_obj.request_type.workflow

        # =====================================================
        # REJECTION REASON CHECK
        # =====================================================

        rejection_message = self.request.data.get(
            "rejection_message"
        )

        if not rejection_message or not rejection_message.strip():
            raise ValidationError(
                "Rejection reason is required."
            )

        # =====================================================
        # SEQUENTIAL APPROVER
        # =====================================================

        if workflow.approver_mode == "SEQUENTIAL":

            current_assignment = request_obj.assignments.filter(
                role="APPROVER",
                order=request_obj.current_approver_order,
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not the assigned approver for this step."
                )

        # =====================================================
        # PARALLEL APPROVER
        # =====================================================

        elif workflow.approver_mode == "PARALLEL":

            current_assignment = request_obj.assignments.filter(
                role="APPROVER",
                user=self.request.user,
                is_active=True
            ).first()

            if not current_assignment:
                raise PermissionDenied(
                    "You are not an assigned approver "
                    "for this request."
                )

            already_acted = RequestApproverAction.objects.filter(
                request=request_obj,
                approver=self.request.user
            ).exists()

            if already_acted:
                raise ValidationError(
                    "You have already acted on this request."
                )

            RequestApproverAction.objects.create(
                request=request_obj,
                approver=self.request.user,
                action="REJECTED"
            )

        # =====================================================
        # REJECT REQUEST
        # =====================================================

        serializer.save(
            status="REJECTED",
            rejection_message=rejection_message.strip(),
            action_deadline=None
        )

        # =====================================================
        # AUDIT
        # =====================================================

        AuditLog.objects.create(
            request=request_obj,
            user=self.request.user,
            action="REJECTED",
            message=(
                f"Request rejected by approver "
                f"{self.request.user.username}. "
                f"Reason: {rejection_message.strip()}"
            )
        )

        # =====================================================
        # NOTIFICATION
        # =====================================================

        Notification.objects.create(
            receiver=request_obj.user,
            message=(
                f'Your request "{request_obj.title}" '
                f'was rejected by the approver. '
                f'Reason: {rejection_message.strip()}'
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

        # =====================================================
        # ADMIN
        # =====================================================

        if user.is_staff:
            return Request.objects.all().order_by(
                "-created_at"
            )

        # =====================================================
        # NORMAL USER
        # =====================================================

        if user.role == "USER":
            return Request.objects.filter(
                user=user
            ).order_by("-created_at")

        # =====================================================
        # VERIFIER
        # =====================================================

        elif user.role == "VERIFIER":

            # -----------------------------------------
            # SEQUENTIAL VERIFIER
            # -----------------------------------------

            sequential_requests = Request.objects.filter(
                status__in=[
                    "PENDING",
                    "DECISION_REQUIRED"
                ],
                current_verifier=user,
                request_type__workflow__verifier_mode="SEQUENTIAL"
            )

            # -----------------------------------------
            # PARALLEL VERIFIER
            # -----------------------------------------

            parallel_requests = Request.objects.filter(
                status__in=[
                    "PENDING",
                    "DECISION_REQUIRED"
                ],
                request_type__workflow__verifier_mode="PARALLEL",
                assignments__user=user,
                assignments__role="VERIFIER",
                assignments__is_active=True
            ).exclude(
                verifier_actions__verifier=user
            )

            return (
                sequential_requests |
                parallel_requests
            ).distinct().order_by("-created_at")

        # =====================================================
        # APPROVER
        # =====================================================

        elif user.role == "APPROVER":

            # -----------------------------------------
            # SEQUENTIAL APPROVER
            # -----------------------------------------

            sequential_requests = Request.objects.filter(
                status__in=[
                    "VERIFIED",
                    "DECISION_REQUIRED"
                ],
                current_approver=user,
                request_type__workflow__approver_mode="SEQUENTIAL"
            )

            # -----------------------------------------
            # PARALLEL APPROVER
            # -----------------------------------------

            parallel_requests = Request.objects.filter(
                status__in=[
                    "VERIFIED",
                    "DECISION_REQUIRED"
                ],
                request_type__workflow__approver_mode="PARALLEL",
                assignments__user=user,
                assignments__role="APPROVER",
                assignments__is_active=True
            ).exclude(
                approver_actions__approver=user
            )

            return (
                sequential_requests |
                parallel_requests
            ).distinct().order_by("-created_at")

        return Request.objects.none()


# =========================================================
# VERIFIER HISTORY
# =========================================================

class VerifierHistoryView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role != "VERIFIER":
            return AuditLog.objects.none()

        return AuditLog.objects.filter(
            user=user,
            action__in=[
                "VERIFIED",
                "REJECTED"
            ]
        ).select_related(
            "request"
        ).order_by("-created_at")


# =========================================================
# APPROVER HISTORY
# =========================================================

class ApproverHistoryView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role != "APPROVER":
            return AuditLog.objects.none()

        return AuditLog.objects.filter(
            user=user,
            action__in=[
                "APPROVED",
                "REJECTED"
            ]
        ).select_related(
            "request"
        ).order_by("-created_at")
