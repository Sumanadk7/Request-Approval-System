from django.urls import path

from .views import (
    RequestTypeListCreateView,
    RequestTypeDetailView
)

urlpatterns = [

    path(
        "",
        RequestTypeListCreateView.as_view(),
        name="request-type-list-create"
    ),

    path(
        "<int:pk>/",
        RequestTypeDetailView.as_view(),
        name="request-type-detail"
    ),

]