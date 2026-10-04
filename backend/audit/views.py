
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        request_id = self.kwargs["request_id"]

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

