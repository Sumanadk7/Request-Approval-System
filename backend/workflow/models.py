from django.db import models
from request_types.models import RequestType


class Workflow(models.Model):

    MODE_CHOICES = (
        ("SEQUENTIAL", "Sequential"),
        ("PARALLEL", "Parallel"),
    )

    request_type = models.OneToOneField(
        RequestType,
        on_delete=models.CASCADE,
        related_name="workflow"
    )

    verifier_mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default="SEQUENTIAL"
    )

    approver_mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default="SEQUENTIAL"
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.request_type.name} Workflow"


class WorkflowAssignment(models.Model):

    ROLE_CHOICES = (
        ("VERIFIER", "Verifier"),
        ("APPROVER", "Approver"),
    )

    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name="assignments"
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="workflow_assignments"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    order = models.PositiveIntegerField(
        default=1
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.workflow} - {self.user.username} - {self.role}"