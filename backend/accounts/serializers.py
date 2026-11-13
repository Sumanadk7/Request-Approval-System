from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
)

from .models import User


EMPLOYEE_ID_MIN = 0

EMPLOYEE_ID_MAX = 9999


def next_available_employee_id():
    used = set(
        User.objects.filter(
            employee_id__isnull=False
        ).values_list("employee_id", flat=True)
    )

    for value in range(EMPLOYEE_ID_MIN, EMPLOYEE_ID_MAX + 1):
        if value not in used:
            return value

    raise ValidationError(
        "No employee IDs available. All 10000 IDs (0000-9999) "
        "are in use."
    )


def validate_employee_id_value(value):
    if value is None:
        return None

    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValidationError(
            "Employee ID must be a number between 0000 and 9999."
        )

    if number < EMPLOYEE_ID_MIN or number > EMPLOYEE_ID_MAX:
        raise ValidationError(
            "Employee ID must be between 0000 and 9999."
        )

    return number


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    employee_id_display = serializers.CharField(
        source="padded_employee_id",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "phone",
            "password",
            "employee_id_display",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            phone=validated_data.get("phone", ""),
            role="USER",
            employee_id=next_available_employee_id(),
        )
        return user


class AdminUserSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8
    )

    role = serializers.ChoiceField(
        choices=User.ROLE_CHOICES,
        required=False,
    )

    employee_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    employee_id_display = serializers.CharField(
        source="padded_employee_id",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "employee_id",
            "employee_id_display",
            "role",
            "is_active",
            "is_staff",
            "created_at",
            "password",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]

    def validate_employee_id(self, value):
        cleaned = validate_employee_id_value(
            None if (value is None or value == "")
            else value
        )

        if cleaned is None:
            return None

        queryset = User.objects.filter(
            employee_id=cleaned
        )

        if self.instance is not None:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise ValidationError(
                f"Employee ID {str(cleaned).zfill(4)} is "
                f"already assigned to another user."
            )

        return cleaned

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        if "employee_id" not in validated_data or (
            validated_data.get("employee_id") is None
        ):
            validated_data["employee_id"] = (
                next_available_employee_id()
            )

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        return instance


class LoginSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        username = attrs.get(self.username_field)

        if isinstance(username, str) and username.isdigit():
            user = User.objects.filter(
                employee_id=int(username)
            ).first()

            if user is not None:
                attrs[self.username_field] = user.username

        return super().validate(attrs)
