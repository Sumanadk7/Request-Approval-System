from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import RequestType
from .serializers import RequestTypeSerializer
from .permissions import IsAdmin


class RequestTypeListCreateView(generics.ListCreateAPIView):
    queryset = RequestType.objects.all().order_by("name")
    serializer_class = RequestTypeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]

        return [IsAdmin()]


class RequestTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RequestType.objects.all()
    serializer_class = RequestTypeSerializer
    permission_classes = [IsAdmin]