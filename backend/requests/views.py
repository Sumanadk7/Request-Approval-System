from rest_framework import generics
from .models import Request
from .serializers import RequestSerializer
from accounts.permissions import IsUser, IsVerifier, IsApprover
from rest_framework.permissions import IsAuthenticated
from notifications.models import Notification

class RequestCreateView(generics.CreateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RequestVerifyView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsVerifier]

    def perform_update(self, serializer):
        if self.get_object().status != "PENDING":
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Only PENDING requests can be verified."
            )
        serializer.save(status="VERIFIED")

        Notification.objects.create(
            receiver=self.get_object().user,
            message=f'Your request "{self.get_object().title}" has been verified.'
        )

class RequestVerifierRejectView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsVerifier]

    def perform_update(self, serializer):
        if self.get_object().status != "PENDING":
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Only PENDING requests can be rejected by verifier."
            )

        serializer.save(status="REJECTED")

        Notification.objects.create(
            receiver=self.get_object().user,
            message=f'Your request "{self.get_object().title}" was rejected by the verifier. Reason: {self.get_object().rejection_message}'
        )

class RequestApproveView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsApprover]

    def perform_update(self, serializer):
        if self.get_object().status != "VERIFIED":
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Only VERIFIED requests can be approved."
            )

        serializer.save(status="APPROVED")

        Notification.objects.create(
            receiver=self.get_object().user,
            message=f'Your request "{self.get_object().title}" has been approved.'
        )


class RequestRejectView(generics.UpdateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsApprover]

    def perform_update(self, serializer):
        if self.get_object().status != "VERIFIED":
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Only VERIFIED requests can be rejected by approver."
            )

        serializer.save(status="REJECTED")

        Notification.objects.create(
            receiver=self.get_object().user,
            message=f'Your request "{self.get_object().title}" was rejected by the approver. Reason: {self.get_object().rejection_message}'
        )



class RequestListView(generics.ListAPIView):
    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "USER":
            return Request.objects.filter(user=user)
        elif user.role == "VERIFIER":
            return Request.objects.filter(status="PENDING")
        elif user.role == "APPROVER":
            return Request.objects.filter(status="VERIFIED")
        return Request.objects.none()