
from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from requests.models import Request, RequestAssignment

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        request_id = self.kwargs["request_id"]

        try:
            request_obj = Request.objects.get(id=request_id)
        except Request.DoesNotExist:
            raise NotFound("Request not found.")

        authorized = (
            user.is_staff
            or request_obj.user_id == user.id
            or RequestAssignment.objects.filter(
                request=request_obj,
                user=user,
                is_active=True
            ).exists()
        )

        if not authorized:
            raise PermissionDenied(
                "You are not authorized to view this request's history."
            )

        return AuditLog.objects.filter(
            request_id=request_id
        ).order_by("created_at")


class AdminAuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if not user.is_staff:
            return AuditLog.objects.none()

        return AuditLog.objects.select_related(
            "request",
            "workflow",
            "user"
        ).order_by("-created_at")

