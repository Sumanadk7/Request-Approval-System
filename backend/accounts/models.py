from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):

    ROLE_CHOICES = (
    ("USER", "User"),
    ("VERIFIER", "Verifier"),
    ("APPROVER", "Approver"),
)

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="USER"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username