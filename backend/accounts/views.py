from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsVerifier, IsUser, IsApprover
from .serializers import RegisterSerializer


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
