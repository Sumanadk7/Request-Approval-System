from django.db import models
from django.conf import settings


class AuditLog(models.Model):

    ACTION_CHOICES = (
        ("CREATED", "Created"),
        ("VERIFIED", "Verified"),
        ("REJECTED", "Rejected"),
        ("APPROVED", "Approved"),
        ("REASSIGNED", "Reassigned"),
    )

    request = models.ForeignKey(
        "requests.Request",
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True
    )

    workflow = models.ForeignKey(
        "workflow.Workflow",
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES
    )

    message = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):

        if self.request:
            return f"{self.request.title} - {self.action}"

        if self.workflow:
            return f"{self.workflow} - {self.action}"

        return f"System - {self.action}"