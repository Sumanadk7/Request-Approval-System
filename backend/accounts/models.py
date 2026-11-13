from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = (
        ("USER", "User"),
        ("VERIFIER", "Verifier"),
        ("APPROVER", "Approver"),
    )

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    employee_id = models.PositiveSmallIntegerField(
        unique=True,
        null=True,
        blank=True,
        help_text=(
            "4-digit employee identifier (0000-9999) used "
            "to log in. Assigned automatically."
        ),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="USER"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username

    def padded_employee_id(self):
        if self.employee_id is None:
            return None

        return str(self.employee_id).zfill(4)