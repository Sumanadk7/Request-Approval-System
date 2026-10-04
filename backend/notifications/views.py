
from rest_framework import generics

from rest_framework.permissions import IsAuthenticated

from .models import Notification

from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            receiver=self.request.user
        ).order_by("-created_at")


class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Notification.objects.all()
        return Notification.objects.filter(
            receiver=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(is_read=True)


class AdminNotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_staff:
            return Notification.objects.none()

        return Notification.objects.all().order_by("-created_at")
