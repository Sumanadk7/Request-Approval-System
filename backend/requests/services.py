from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from accounts.models import User
from audit.models import AuditLog
from notifications.models import Notification

from .models import (
    Request,
    RequestAssignment,
    RequestApproverAction,
    RequestVerifierAction,
)


EDIT_WINDOW = timedelta(hours=24)

ACTION_WINDOW = timedelta(hours=24)


def notify_admins(message):
    admins = User.objects.filter(
        is_staff=True,
        is_active=True
    )

    for admin in admins:
        Notification.objects.create(
            receiver=admin,
            message=message
        )


def notify_users(users, message):
    for user in users:
        if user is None:
            continue

        Notification.objects.create(
            receiver=user,
            message=message
        )


def _pending_verifiers(request_obj, workflow):
    if workflow.verifier_mode == "SEQUENTIAL":
        assignments = RequestAssignment.objects.filter(
            request=request_obj,
            role="VERIFIER",
            order=request_obj.current_verifier_order,
            is_active=True,
        )
    else:
        acted_ids = RequestVerifierAction.objects.filter(
            request=request_obj
        ).values_list("verifier_id", flat=True)

        assignments = RequestAssignment.objects.filter(
            request=request_obj,
            role="VERIFIER",
            is_active=True,
        ).exclude(user_id__in=acted_ids)

    return {
        assignment.user
        for assignment in assignments
        if assignment.user is not None
    }


def _pending_approvers(request_obj, workflow):
    if workflow.approver_mode == "SEQUENTIAL":
        assignments = RequestAssignment.objects.filter(
            request=request_obj,
            role="APPROVER",
            order=request_obj.current_approver_order,
            is_active=True,
        )
    else:
        acted_ids = RequestApproverAction.objects.filter(
            request=request_obj
        ).values_list("approver_id", flat=True)

        assignments = RequestAssignment.objects.filter(
            request=request_obj,
            role="APPROVER",
            is_active=True,
        ).exclude(user_id__in=acted_ids)

    return {
        assignment.user
        for assignment in assignments
        if assignment.user is not None
    }


def process_overdue_requests():
    """
    Notify the current verifiers/approvers once their 24-hour action
    window has expired, then flag the request as decision required.
    """

    overdue_ids = list(
        Request.objects.filter(
            action_deadline__lte=timezone.now(),
            status__in=["PENDING", "VERIFIED"],
            deadline_alert_sent=False,
        ).values_list("id", flat=True)
    )

    processed = 0

    for request_id in overdue_ids:
        with transaction.atomic():
            try:
                request_obj = (
                    Request.objects.select_for_update()
                    .get(id=request_id)
                )
            except Request.DoesNotExist:
                continue

            if (
                request_obj.status not in ["PENDING", "VERIFIED"]
                or request_obj.action_deadline is None
                or request_obj.action_deadline > timezone.now()
                or request_obj.deadline_alert_sent
            ):
                continue

            workflow = request_obj.request_type.workflow

            if request_obj.status == "PENDING":
                recipients = _pending_verifiers(request_obj, workflow)
                action_label = "verification"
                action_verb = "verify"
            else:
                recipients = _pending_approvers(request_obj, workflow)
                action_label = "approval"
                action_verb = "approve"

            notify_users(
                recipients,
                f'REMINDER: Request "{request_obj.title}" is awaiting '
                f'your {action_label}. Please view and {action_verb} it '
                f'soon. The 24-hour action window has ended.',
            )

            notify_admins(
                f'ALERT: Request "{request_obj.title}" has exceeded its '
                f'24-hour action deadline and requires a decision.'
            )

            request_obj.status = "DECISION_REQUIRED"
            request_obj.deadline_alert_sent = True
            request_obj.save(
                update_fields=["status", "deadline_alert_sent"]
            )

            processed += 1

    return processed


def submit_draft_request(request_obj, automatic=True):
    """
    Move a draft request into the verification flow.

    Verifier and approver assignments are captured at submission time so
    changes made to the request type/workflow during the editing window are
    respected. The action deadline is restarted from the moment of
    submission.
    """

    workflow = getattr(request_obj.request_type, "workflow", None)

    if workflow is not None and workflow.is_active:

        if not request_obj.assignments.exists():
            for assignment in workflow.assignments.filter(
                role="VERIFIER",
                is_active=True
            ):
                RequestAssignment.objects.create(
                    request=request_obj,
                    user=assignment.user,
                    role="VERIFIER",
                    order=assignment.order
                )

            for assignment in workflow.assignments.filter(
                role="APPROVER",
                is_active=True
            ):
                RequestAssignment.objects.create(
                    request=request_obj,
                    user=assignment.user,
                    role="APPROVER",
                    order=assignment.order
                )

        first_verifier = workflow.assignments.filter(
            role="VERIFIER",
            order=1,
            is_active=True
        ).first()

    else:
        first_verifier = None

    request_obj.status = "PENDING"
    request_obj.current_verifier = (
        first_verifier.user if first_verifier else None
    )
    request_obj.current_verifier_order = 1
    request_obj.current_approver = None
    request_obj.current_approver_order = 1
    request_obj.action_deadline = timezone.now() + ACTION_WINDOW
    request_obj.deadline_alert_sent = False

    request_obj.save(
        update_fields=[
            "status",
            "current_verifier",
            "current_verifier_order",
            "current_approver",
            "current_approver_order",
            "action_deadline",
            "deadline_alert_sent",
        ]
    )

    AuditLog.objects.create(
        request=request_obj,
        user=request_obj.user,
        action="SUBMITTED",
        message=(
            "Request submitted automatically after the "
            "24-hour editing window."
            if automatic
            else "Request submitted by the owner after review."
        )
    )

    notify_users(
        [request_obj.user],
        f'Your request "{request_obj.title}" '
        f'has been submitted for verification.'
    )

    notify_admins(
        f'Request "{request_obj.title}" submitted by '
        f'{request_obj.user.username} '
        + (
            "after the 24-hour editing window."
            if automatic
            else "after review."
        )
    )

    verifier_users = User.objects.filter(
        id__in=request_obj.assignments.filter(
            role="VERIFIER",
            is_active=True
        ).values_list("user_id", flat=True),
        is_active=True
    )

    if verifier_users.exists():
        notify_users(
            verifier_users,
            f'New request "{request_obj.title}" '
            f'awaits your verification.'
        )
    else:
        notify_admins(
            f'ALERT: Request "{request_obj.title}" was submitted but '
            f'no active verifier workflow is available.'
        )

    return request_obj


def submit_due_drafts():
    """
    Submit every draft whose 24-hour editing window has expired.

    Safe to call repeatedly: each request is re-checked under a row lock
    before it is submitted.
    """

    due_ids = list(
        Request.objects.filter(
            status="DRAFT",
            action_deadline__lte=timezone.now()
        ).values_list("id", flat=True)
    )

    submitted = 0

    for request_id in due_ids:
        with transaction.atomic():
            try:
                request_obj = Request.objects.select_for_update().get(
                    id=request_id,
                    status="DRAFT"
                )
            except Request.DoesNotExist:
                continue

            if (
                request_obj.action_deadline is None
                or request_obj.action_deadline > timezone.now()
            ):
                continue

            submit_draft_request(request_obj)
            submitted += 1

    return submitted
