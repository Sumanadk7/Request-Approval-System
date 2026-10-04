
from django.urls import path

from .views import (
    AuditLogListView,
    AdminAuditLogListView,
)


urlpatterns = [
    path(
        "requests/<int:request_id>/",
        AuditLogListView.as_view(),
        name="audit-request-list"
    ),

    path(
        "admin/",
        AdminAuditLogListView.as_view(),
        name="admin-audit-list"
    ),
]
