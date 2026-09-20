from rest_framework import generics

from .models import Workflow, WorkflowAssignment
from .serializers import WorkflowSerializer, WorkflowAssignmentSerializer
from .permissions import IsAdmin


class WorkflowListCreateView(generics.ListCreateAPIView):

    queryset = Workflow.objects.all().order_by("request_type")
    serializer_class = WorkflowSerializer
    permission_classes = [IsAdmin]


class WorkflowDetailView(generics.RetrieveUpdateDestroyAPIView):

    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAdmin]


class WorkflowAssignmentListCreateView(generics.ListCreateAPIView):

    serializer_class = WorkflowAssignmentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        workflow_id = self.kwargs["workflow_id"]

        return WorkflowAssignment.objects.filter(
            workflow_id=workflow_id
        ).order_by("role", "order")

    def perform_create(self, serializer):
        serializer.save(
            workflow_id=self.kwargs["workflow_id"]
        )