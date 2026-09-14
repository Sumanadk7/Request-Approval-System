from rest_framework import generics

from .models import RequestType
from .serializers import RequestTypeSerializer
from .permissions import IsAdmin


class RequestTypeListCreateView(generics.ListCreateAPIView):
    queryset = RequestType.objects.all().order_by("name")
    serializer_class = RequestTypeSerializer
    permission_classes = [IsAdmin]


class RequestTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RequestType.objects.all()
    serializer_class = RequestTypeSerializer
    permission_classes = [IsAdmin]