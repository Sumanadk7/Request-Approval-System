from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    role = serializers.ChoiceField(
        choices=[
            ("USER", "User"),
            ("VERIFIER", "Verifier"),
            ("APPROVER", "Approver"),
        ],
        default="USER",
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "phone",
            "password",
            "role",
        ]

    def create(self, validated_data):
        role = validated_data.pop("role", "USER")
        if role not in ("USER", "VERIFIER", "APPROVER"):
            role = "USER"
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            phone=validated_data.get("phone", ""),
            role=role,
        )
        return user


class AdminUserSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
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

    def create(self, validated_data):
        password = validated_data.pop("password", None)

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