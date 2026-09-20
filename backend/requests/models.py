from django.db import models
from django.conf import settings
from request_types.models import RequestType


class Request(models.Model):

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("VERIFIED", "Verified"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="requests"
    )

    request_type = models.ForeignKey(
        RequestType,
        on_delete=models.PROTECT,
        related_name="requests"
    )

    title = models.CharField(
        max_length=200
    )

    description = models.TextField()

    rejection_message = models.TextField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    current_verifier_order = models.PositiveIntegerField(
        default=1
    )

    current_approver_order = models.PositiveIntegerField(
        default=1
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.title



class RequestVerifierAction(models.Model):

    request = models.ForeignKey(
        Request,
        on_delete=models.CASCADE,
        related_name="verifier_actions"
    )

    verifier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verifier_actions"
    )

    action = models.CharField(
        max_length=20,
        choices=(
            ("VERIFIED", "Verified"),
            ("REJECTED", "Rejected"),
        )
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request", "verifier"],
                name="unique_request_verifier_action"
            )
        ]

    def __str__(self):
        return f"{self.request.title} - {self.verifier.username} - {self.action}"