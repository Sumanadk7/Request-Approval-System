from django.core.management.base import BaseCommand
from django.utils import timezone

from requests.models import (
    Request,
    RequestVerifierAction,
    RequestApproverAction,
    RequestAssignment
)

from notifications.models import Notification
from accounts.models import User


class Command(BaseCommand):

    help = "Check expired request deadlines and mark them as decision required"

    def handle(self, *args, **kwargs):

        now = timezone.now()

        expired_requests = Request.objects.filter(
            action_deadline__lte=now,
            status__in=["PENDING", "VERIFIED"],
            deadline_alert_sent=False
        )

        for request_obj in expired_requests:

            # ==========================================
            # FIND CURRENT ACTIONABLE ASSIGNEES
            # ==========================================

            if request_obj.status == "PENDING":

                workflow = request_obj.request_type.workflow

                # ------------------------------------------
                # SEQUENTIAL VERIFIER
                # ------------------------------------------

                if workflow.verifier_mode == "SEQUENTIAL":

                    assignments = RequestAssignment.objects.filter(
                        request=request_obj,
                        role="VERIFIER",
                        order=request_obj.current_verifier_order,
                        is_active=True
                    )

                # ------------------------------------------
                # PARALLEL VERIFIER
                # ------------------------------------------

                else:

                    acted_verifiers = RequestVerifierAction.objects.filter(
                        request=request_obj
                    ).values_list(
                        "verifier_id",
                        flat=True
                    )

                    assignments = RequestAssignment.objects.filter(
                        request=request_obj,
                        role="VERIFIER",
                        is_active=True
                    ).exclude(
                        user_id__in=acted_verifiers
                    )

                # ------------------------------------------
                # NOTIFY VERIFIERS
                # ------------------------------------------

                for assignment in assignments:

                    if assignment.user:

                        Notification.objects.create(
                            receiver=assignment.user,
                            message=(
                                f'Request "{request_obj.title}" '
                                f'requires your decision. '
                                f'The 24-hour action deadline has expired.'
                            )
                        )

            # ==========================================
            # VERIFIED → APPROVER DEADLINE
            # ==========================================

            elif request_obj.status == "VERIFIED":

                workflow = request_obj.request_type.workflow

                # ------------------------------------------
                # SEQUENTIAL APPROVER
                # ------------------------------------------

                if workflow.approver_mode == "SEQUENTIAL":

                    assignments = RequestAssignment.objects.filter(
                        request=request_obj,
                        role="APPROVER",
                        order=request_obj.current_approver_order,
                        is_active=True
                    )

                # ------------------------------------------
                # PARALLEL APPROVER
                # ------------------------------------------

                else:

                    acted_approvers = RequestApproverAction.objects.filter(
                        request=request_obj
                    ).values_list(
                        "approver_id",
                        flat=True
                    )

                    assignments = RequestAssignment.objects.filter(
                        request=request_obj,
                        role="APPROVER",
                        is_active=True
                    ).exclude(
                        user_id__in=acted_approvers
                    )

                # ------------------------------------------
                # NOTIFY APPROVERS
                # ------------------------------------------

                for assignment in assignments:

                    if assignment.user:

                        Notification.objects.create(
                            receiver=assignment.user,
                            message=(
                                f'Request "{request_obj.title}" '
                                f'requires your decision. '
                                f'The 24-hour action deadline has expired.'
                            )
                        )

            # ==========================================
            # MARK REQUEST AS DECISION REQUIRED
            # ==========================================

            request_obj.status = "DECISION_REQUIRED"
            request_obj.deadline_alert_sent = True

            request_obj.save(
                update_fields=[
                    "status",
                    "deadline_alert_sent"
                ]
            )

            # ==========================================
            # ADMIN ALERT
            # ==========================================

            admin_users = User.objects.filter(
                is_staff=True,
                is_active=True
            )

            for admin in admin_users:

                Notification.objects.create(
                    receiver=admin,
                    message=(
                        f'ALERT: Request "{request_obj.title}" '
                        f'has exceeded its 24-hour action deadline '
                        f'and requires a decision.'
                    )
                )

            # ==========================================
            # CONSOLE OUTPUT
            # ==========================================

            self.stdout.write(
                self.style.WARNING(
                    f"Decision required: Request #{request_obj.id}"
                )
            )

        # ==========================================
        # FINAL MESSAGE
        # ==========================================

        self.stdout.write(
            self.style.SUCCESS(
                "Deadline check completed."
            )
        )