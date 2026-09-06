from django.urls import path

from .views import (
    RegisterView,
    ProfileView,
    VerifierTestView,
    UserTestView,
    ApproverTestView,
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
]
