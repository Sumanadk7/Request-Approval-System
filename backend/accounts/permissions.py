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