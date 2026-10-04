from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User

from .permissions import (
    IsVerifier,
    IsUser,
    IsApprover,
    IsAdmin,
)

from .serializers import (
    RegisterSerializer,
    AdminUserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "message": "You are authenticated!",
            "username": request.user.username,
            "email": request.user.email,
            "role": request.user.role,
            "is_staff": request.user.is_staff,
        })


class VerifierTestView(APIView):
    permission_classes = [IsVerifier]

    def get(self, request):
        return Response({
            "message": "Welcome Verifier!",
            "username": request.user.username,
            "role": request.user.role,
        })


class UserTestView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        return Response({
            "message": "Welcome User!",
            "username": request.user.username,
            "role": request.user.role,
        })


class ApproverTestView(APIView):
    permission_classes = [IsApprover]

    def get(self, request):
        return Response({
            "message": "Welcome Approver!",
            "username": request.user.username,
            "role": request.user.role,
        })


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Admin access required."},
                status=403
            )

        from departments.models import Department
        from request_types.models import RequestType
        from workflow.models import Workflow
        from requests.models import Request

        return Response({
            "total_users": User.objects.count(),
            "total_departments": Department.objects.count(),
            "total_request_types": RequestType.objects.count(),
            "total_workflows": Workflow.objects.count(),
            "total_requests": Request.objects.count(),
            "pending_requests": Request.objects.filter(
                status__in=["PENDING", "DECISION_REQUIRED"]
            ).count(),
        })


class AdminUserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("id")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]