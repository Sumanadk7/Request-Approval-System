import json

from django.test import Client, TestCase

from accounts.models import User
from departments.models import Department
from request_types.models import RequestType
from workflow.models import Workflow, WorkflowAssignment


def auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    return Client(HTTP_AUTHORIZATION=f"Bearer {token}")


class RequestAuditAccessTests(TestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="auditowner",
            email="auditowner@test.com",
            password="password123",
            role="USER",
        )
        self.verifier = User.objects.create_user(
            username="auditverifier",
            email="auditverifier@test.com",
            password="password123",
            role="VERIFIER",
        )
        self.approver = User.objects.create_user(
            username="auditapprover",
            email="auditapprover@test.com",
            password="password123",
            role="APPROVER",
        )
        self.admin = User.objects.create_user(
            username="auditadmin",
            email="auditadmin@test.com",
            password="password123",
            role="USER",
            is_staff=True,
        )
        self.outsider = User.objects.create_user(
            username="auditoutsider",
            email="auditoutsider@test.com",
            password="password123",
            role="USER",
        )

        department = Department.objects.create(name="AuditDept")
        request_type = RequestType.objects.create(
            name="AuditType",
            department=department,
        )
        workflow = Workflow.objects.create(
            request_type=request_type,
            verifier_mode="SEQUENTIAL",
            approver_mode="SEQUENTIAL",
        )
        WorkflowAssignment.objects.create(
            workflow=workflow,
            user=self.verifier,
            role="VERIFIER",
            order=1,
        )
        WorkflowAssignment.objects.create(
            workflow=workflow,
            user=self.approver,
            role="APPROVER",
            order=1,
        )

        response = auth_client(self.owner).post(
            "/api/requests/create/",
            data=json.dumps(
                {
                    "request_type": request_type.id,
                    "title": "Audited request",
                    "description": "Check audit access.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.request_id = json.loads(response.content)["id"]

    def test_owner_can_view_audit(self):
        response = auth_client(self.owner).get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(json.loads(response.content)) >= 1)

    def test_admin_can_view_audit(self):
        response = auth_client(self.admin).get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 200)

    def test_assigned_verifier_can_view_audit(self):
        response = auth_client(self.verifier).get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 200)

    def test_assigned_approver_can_view_audit(self):
        response = auth_client(self.approver).get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 200)

    def test_outsider_forbidden(self):
        response = auth_client(self.outsider).get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 403)

    def test_nonexistent_request_404(self):
        response = auth_client(self.admin).get("/api/audit/requests/999999/")
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_rejected(self):
        response = Client().get(
            f"/api/audit/requests/{self.request_id}/"
        )
        self.assertEqual(response.status_code, 401)
