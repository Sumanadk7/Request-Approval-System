from django.urls import path

from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
    VerifierTestView,
    UserTestView,
    ApproverTestView,
    AdminStatsView,
    AdminUserListCreateView,
    AdminUserDetailView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),
    path(
        "profile/",
        ProfileView.as_view(),
        name="profile"
    ),
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password"
    ),
    path(
        "verifier-test/",
        VerifierTestView.as_view(),
        name="verifier-test"
    ),
    path(
        "user-test/",
        UserTestView.as_view(),
        name="user-test"
    ),
    path(
        "approver-test/",
        ApproverTestView.as_view(),
        name="approver-test"
    ),
    path(
        "admin-stats/",
        AdminStatsView.as_view(),
        name="admin-stats"
    ),
    path(
        "admin-users/",
        AdminUserListCreateView.as_view(),
        name="admin-users"
    ),
    path(
        "admin-users/<int:pk>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail"
    ),
]