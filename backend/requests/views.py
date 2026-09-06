from rest_framework import generics
from .models import Request
from .serializers import RequestSerializer
from accounts.permissions import IsUser


class RequestCreateView(generics.CreateAPIView):

    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
