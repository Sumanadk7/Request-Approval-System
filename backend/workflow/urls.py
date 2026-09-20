from django.urls import path

from .views import (
    WorkflowListCreateView,
    WorkflowDetailView,
    WorkflowAssignmentListCreateView
)


urlpatterns = [

    path(
        "",
        WorkflowListCreateView.as_view(),
        name="workflow-list-create"
    ),

    path(
        "<int:pk>/",
        WorkflowDetailView.as_view(),
        name="workflow-detail"
    ),

    path(
        "<int:workflow_id>/assignments/",
        WorkflowAssignmentListCreateView.as_view(),
        name="workflow-assignment-list-create"
    ),

]