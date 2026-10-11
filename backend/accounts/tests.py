import json

from django.test import Client, TestCase

from rest_framework.throttling import ScopedRateThrottle

from .models import User


def api_post(path, payload, token=None):
    client = Client()
    headers = {}
    if token:
        headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return client.post(
        path,
        data=json.dumps(payload),
        content_type="application/json",
        **headers,
    )


def get_token(username, password):
    response = api_post(
        "/api/token/",
        {"username": username, "password": password},
    )
    assert response.status_code == 200, response.content
    return json.loads(response.content)["access"]


class RegistrationTests(TestCase):

    def test_register_user_defaults_to_user_role(self):
        response = api_post(
            "/api/accounts/register/",
            {
                "username": "newuser",
                "email": "newuser@test.com",
                "password": "password123",
            },
        )

        self.assertEqual(response.status_code, 201)

        user = User.objects.get(username="newuser")
        self.assertEqual(user.role, "USER")
        self.assertFalse(user.is_staff)

    def test_register_verifier_role(self):
        response = api_post(
            "/api/accounts/register/",
            {
                "username": "newverifier",
                "email": "newverifier@test.com",
                "password": "password123",
                "role": "VERIFIER",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            User.objects.get(username="newverifier").role, "VERIFIER"
        )

    def test_register_admin_role_rejected(self):
        response = api_post(
            "/api/accounts/register/",
            {
                "username": "fakeadmin",
                "email": "fakeadmin@test.com",
                "password": "password123",
                "role": "ADMIN",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="fakeadmin").exists())

    def test_register_ignores_is_staff(self):
        response = api_post(
            "/api/accounts/register/",
            {
                "username": "sneaky",
                "email": "sneaky@test.com",
                "password": "password123",
                "is_staff": True,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(User.objects.get(username="sneaky").is_staff)


class AuthTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="authuser",
            email="authuser@test.com",
            password="password123",
            role="USER",
        )
        self.token = get_token("authuser", "password123")

    def test_profile_requires_auth(self):
        response = Client().get("/api/accounts/profile/")
        self.assertEqual(response.status_code, 401)

    def test_profile_returns_role(self):
        client = Client(
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )
        response = client.get("/api/accounts/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content)["username"], "authuser"
        )

    def test_change_password(self):
        response = api_post(
            "/api/accounts/change-password/",
            {"old_password": "password123", "new_password": "newpass456"},
            token=self.token,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass456"))

    def test_change_password_wrong_old(self):
        response = api_post(
            "/api/accounts/change-password/",
            {"old_password": "wrong", "new_password": "newpass456"},
            token=self.token,
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_users_requires_staff(self):
        client = Client(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        response = client.get("/api/accounts/admin-users/")
        self.assertEqual(response.status_code, 403)


class AdminUserTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="testadmin",
            email="testadmin@test.com",
            password="password123",
            role="USER",
            is_staff=True,
        )
        self.token = get_token("testadmin", "password123")

    def test_admin_create_and_deactivate_user(self):
        created = api_post(
            "/api/accounts/admin-users/",
            {
                "username": "managed",
                "email": "managed@test.com",
                "password": "password123",
                "role": "VERIFIER",
                "is_active": True,
            },
            token=self.token,
        )
        self.assertEqual(created.status_code, 201)

        user_id = json.loads(created.content)["id"]
        client = Client(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        patched = client.patch(
            f"/api/accounts/admin-users/{user_id}/",
            data=json.dumps({"is_active": False}),
            content_type="application/json",
        )
        self.assertEqual(patched.status_code, 200)
        self.assertFalse(User.objects.get(username="managed").is_active)

    def test_admin_stats(self):
        client = Client(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        response = client.get("/api/accounts/admin-stats/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_users", json.loads(response.content))


class AdminRoleValidationTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="roleadmin",
            email="roleadmin@test.com",
            password="password123",
            role="USER",
            is_staff=True,
        )
        self.token = get_token("roleadmin", "password123")
        self.staff = User.objects.create_user(
            username="roleuser",
            email="roleuser@test.com",
            password="password123",
            role="USER",
        )

    def test_admin_create_valid_role(self):
        response = api_post(
            "/api/accounts/admin-users/",
            {
                "username": "approverx",
                "email": "approverx@test.com",
                "password": "password123",
                "role": "APPROVER",
                "is_active": True,
            },
            token=self.token,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            User.objects.get(username="approverx").role, "APPROVER"
        )

    def test_admin_create_invalid_role_rejected(self):
        response = api_post(
            "/api/accounts/admin-users/",
            {
                "username": "weirdrole",
                "email": "weirdrole@test.com",
                "password": "password123",
                "role": "SUPERADMIN",
                "is_active": True,
            },
            token=self.token,
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="weirdrole").exists())

    def test_admin_update_invalid_role_rejected(self):
        client = Client(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        response = client.patch(
            f"/api/accounts/admin-users/{self.staff.id}/",
            data=json.dumps({"role": "ADMIN"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, "USER")

    def test_non_admin_cannot_create_user(self):
        user_token = get_token("roleuser", "password123")
        # roleuser is not staff
        response = api_post(
            "/api/accounts/admin-users/",
            {
                "username": "blocked",
                "email": "blocked@test.com",
                "password": "password123",
                "role": "USER",
            },
            token=user_token,
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username="blocked").exists())


# NOTE: DRF reads THROTTLE_RATES from a dict captured at import time,
# so override_settings(REST_FRAMEWORK=...) cannot change the login rate
# in tests. Patch the class attribute instead (restored afterwards).
class LoginThrottleTests(TestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._old_rates = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = {"login": "3/minute"}

    @classmethod
    def tearDownClass(cls):
        ScopedRateThrottle.THROTTLE_RATES = cls._old_rates
        super().tearDownClass()

    def login(self, username="nobody", password="wrong", ip="10.9.9.9"):
        return Client(REMOTE_ADDR=ip).post(
            "/api/token/",
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
        )

    def test_login_allowed_below_limit(self):
        for _ in range(3):
            response = self.login(ip="10.9.9.1")
            self.assertIn(
                response.status_code, (200, 401)
            )
            self.assertNotEqual(response.status_code, 429)

    def test_login_throttled_above_limit(self):
        for _ in range(3):
            response = self.login(ip="10.9.9.2")
            self.assertNotEqual(response.status_code, 429)
        throttled = self.login(ip="10.9.9.2")
        self.assertEqual(throttled.status_code, 429)
