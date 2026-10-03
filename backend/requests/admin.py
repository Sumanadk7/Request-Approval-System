
from django.contrib import admin

from .models import (
    Request,
    RequestVerifierAction,
    RequestAssignment,
    RequestApproverAction,
)


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "user",
        "request_type",
        "status",
        "current_verifier",
        "current_approver",
        "action_deadline",
        "created_at",
    )

    list_filter = (
        "status",
        "request_type",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "user__username",
    )

    ordering = ("-created_at",)


@admin.register(RequestAssignment)
class RequestAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "request",
        "user",
        "role",
        "order",
        "is_active",
        "assigned_at",
    )

    list_filter = (
        "role",
        "is_active",
    )

    search_fields = (
        "request__title",
        "user__username",
    )

    ordering = ("-assigned_at",)


@admin.register(RequestVerifierAction)
class RequestVerifierActionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "request",
        "verifier",
        "action",
        "created_at",
    )

    list_filter = (
        "action",
        "created_at",
    )

    search_fields = (
        "request__title",
        "verifier__username",
    )

    ordering = ("-created_at",)


@admin.register(RequestApproverAction)
class RequestApproverActionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "request",
        "approver",
        "action",
        "created_at",
    )

    list_filter = (
        "action",
        "created_at",
    )

    search_fields = (
        "request__title",
        "approver__username",
    )

    ordering = ("-created_at",)

