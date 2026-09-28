from django.urls import path
from .views import AuditLogListView


urlpatterns = [
    path(
        "requests/<int:request_id>/",
        AuditLogListView.as_view(),
        name="audit-request-list"
    ),
]