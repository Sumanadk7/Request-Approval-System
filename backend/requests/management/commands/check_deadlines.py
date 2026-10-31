from django.core.management.base import BaseCommand

from requests.services import (
    process_overdue_requests,
    submit_due_drafts,
)


class Command(BaseCommand):

    help = (
        "Submit drafts whose editing window has ended and remind "
        "verifiers/approvers whose 24-hour action window has expired"
    )

    def handle(self, *args, **kwargs):

        submitted = submit_due_drafts()

        if submitted:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Submitted {submitted} draft request(s)."
                )
            )

        processed = process_overdue_requests()

        if processed:
            self.stdout.write(
                self.style.WARNING(
                    f"Sent overdue reminders for {processed} "
                    f"request(s)."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Deadline check completed."
            )
        )
