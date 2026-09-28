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