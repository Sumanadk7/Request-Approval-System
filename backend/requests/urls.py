from django.urls import path
from .views import RequestCreateView


urlpatterns = [
    path(
        "create/",
        RequestCreateView.as_view(),
        name="request-create"
    ),
]
