from django.urls import path

from .views import (
    RequestCreateView,
    RequestListView,
    RequestVerifyView,
    RequestVerifierRejectView,
    RequestApproveView,
    RequestRejectView
)

urlpatterns = [

    path(
        "create/",
        RequestCreateView.as_view(),
        name="request-create"
    ),

    path(
        "<int:pk>/verify/",
        RequestVerifyView.as_view(),
        name="request-verify"
    ),

    path(
        "<int:pk>/verifier-reject/",
        RequestVerifierRejectView.as_view(),
        name="request-verifier-reject"
    ),

    path(
        "<int:pk>/approve/",
        RequestApproveView.as_view(),
        name="request-approve"
    ),

    path(
        "<int:pk>/reject/",
        RequestRejectView.as_view(),
        name="request-reject"
    ),

    path(
    "list/",
    RequestListView.as_view(),
    name="request-list"
    ),
]