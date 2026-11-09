from django.urls import path

from .views import (
    WorkflowListCreateView,
    WorkflowDetailView,
    WorkflowAssignmentListCreateView,
    WorkflowAssignmentReassignView,
    WorkflowAssignmentRemoveView
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

    path(
        "assignments/<int:pk>/reassign/",
        WorkflowAssignmentReassignView.as_view(),
        name="workflow-assignment-reassign"
    ),

    path(
        "assignments/<int:pk>/remove/",
        WorkflowAssignmentRemoveView.as_view(),
        name="workflow-assignment-remove"
    ),

]