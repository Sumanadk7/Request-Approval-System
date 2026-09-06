from django.db import models
from django.conf import settings


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

    title = models.CharField(max_length=200)

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
