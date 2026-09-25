from django.core.management.base import BaseCommand
from django.utils import timezone

from requests.models import Request
from notifications.models import Notification
from accounts.models import User


class Command(BaseCommand):

    help = "Check expired request deadlines and create notifications"

    def handle(self, *args, **kwargs):

        now = timezone.now()

        expired_requests = Request.objects.filter(
            action_deadline__lte=now,
            status__in=["PENDING", "VERIFIED"],
            deadline_alert_sent=False
        )

        for request_obj in expired_requests:

            workflow = request_obj.request_type.workflow

            # ==========================================
            # PENDING → VERIFIER DEADLINE
            # ==========================================

            if request_obj.status == "PENDING":

                verifiers = workflow.assignments.filter(
                    role="VERIFIER",
                    is_active=True
                )

                for assignment in verifiers:

                    Notification.objects.create(
                        receiver=assignment.user,
                        message=(
                            f'Request "{request_obj.title}" '
                            f'has exceeded its 24-hour action deadline.'
                        )
                    )

            # ==========================================
            # VERIFIED → APPROVER DEADLINE
            # ==========================================

            elif request_obj.status == "VERIFIED":

                approvers = workflow.assignments.filter(
                    role="APPROVER",
                    is_active=True
                )

                for assignment in approvers:

                    Notification.objects.create(
                        receiver=assignment.user,
                        message=(
                            f'Request "{request_obj.title}" '
                            f'has exceeded its 24-hour action deadline.'
                        )
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
                        f'has exceeded its 24-hour action deadline.'
                    )
                )

            # ==========================================
            # MARK ALERT AS SENT
            # ==========================================

            request_obj.deadline_alert_sent = True

            request_obj.save(
                update_fields=["deadline_alert_sent"]
            )

            self.stdout.write(
                self.style.WARNING(
                    f"Deadline exceeded: Request #{request_obj.id}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Deadline check completed."
            )
        )