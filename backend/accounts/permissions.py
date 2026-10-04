from rest_framework.permissions import BasePermission


class IsUser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "USER"
        )


class IsVerifier(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "VERIFIER"
        )


class IsApprover(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "APPROVER"
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_staff
        )


class IsAssignedApprover(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "APPROVER"
        )

    def has_object_permission(self, request, view, obj):
        return obj.assignments.filter(
            user=request.user,
            role="APPROVER",
            is_active=True
        ).exists()


class IsAssignedVerifier(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "VERIFIER"
        )

    def has_object_permission(self, request, view, obj):
        return obj.assignments.filter(
            user=request.user,
            role="VERIFIER",
            is_active=True
        ).exists()