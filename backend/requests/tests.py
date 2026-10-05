import json

from django.test import Client, TestCase

from accounts.models import User
from departments.models import Department
from notifications.models import Notification
from request_types.models import RequestType
from workflow.models import Workflow, WorkflowAssignment

from .models import Request


def auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    return Client(HTTP_AUTHORIZATION=f"Bearer {token}")


class RequestFlowTests(TestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="flowowner",
            email="flowowner@test.com",
            password="password123",
            role="USER",
        )
        self.verifier = User.objects.create_user(
            username="flowverifier",
            email="flowverifier@test.com",
            password="password123",
            role="VERIFIER",
        )
        self.approver = User.objects.create_user(
            username="flowapprover",
            email="flowapprover@test.com",
            password="password123",
            role="APPROVER",
        )
        self.admin = User.objects.create_user(
            username="flowadmin",
            email="flowadmin@test.com",
            password="password123",
            role="USER",
            is_staff=True,
        )

        department = Department.objects.create(name="FlowDept")
        request_type = RequestType.objects.create(
            name="FlowType",
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
        self.request_type_id = request_type.id

    def create_request(self):
        response = auth_client(self.owner).post(
            "/api/requests/create/",
            data=json.dumps(
                {
                    "request_type": self.request_type_id,
                    "title": "Flow request",
                    "description": "Testing the flow.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        return json.loads(response.content)["id"]

    def test_create_notifies_admin_and_verifier(self):
        request_id = self.create_request()

        self.assertTrue(
            Notification.objects.filter(
                receiver=self.admin,
                message__contains="Flow request",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                receiver=self.verifier,
                message__contains="Flow request",
            ).exists()
        )
        self.assertEqual(
            Request.objects.get(id=request_id).current_verifier,
            self.verifier,
        )

    def test_verify_then_approve(self):
        request_id = self.create_request()

        verify = auth_client(self.verifier).patch(
            f"/api/requests/{request_id}/verify/",
            data=json.dumps({"verification_message": "Looks good."}),
            content_type="application/json",
        )
        self.assertEqual(verify.status_code, 200, verify.content)

        request_obj = Request.objects.get(id=request_id)
        self.assertEqual(request_obj.status, "VERIFIED")
        self.assertEqual(request_obj.verification_message, "Looks good.")

        approve = auth_client(self.approver).patch(
            f"/api/requests/{request_id}/approve/",
            data=json.dumps({"approval_message": "Approved with note."}),
            content_type="application/json",
        )
        self.assertEqual(approve.status_code, 200, approve.content)

        request_obj.refresh_from_db()
        self.assertEqual(request_obj.status, "APPROVED")
        self.assertEqual(request_obj.approval_message, "Approved with note.")

    def test_verifier_reject_requires_reason(self):
        request_id = self.create_request()

        rejected = auth_client(self.verifier).patch(
            f"/api/requests/{request_id}/verifier-reject/",
            data=json.dumps({"rejection_message": "Incomplete documents."}),
            content_type="application/json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.content)
        self.assertEqual(
            Request.objects.get(id=request_id).status, "REJECTED"
        )

        request_id_2 = self.create_request()
        no_reason = auth_client(self.verifier).patch(
            f"/api/requests/{request_id_2}/verifier-reject/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(no_reason.status_code, 400)

    def test_detail_permission(self):
        request_id = self.create_request()

        outsider = User.objects.create_user(
            username="outsider",
            email="outsider@test.com",
            password="password123",
            role="USER",
        )
        denied = auth_client(outsider).get(f"/api/requests/{request_id}/")
        self.assertEqual(denied.status_code, 403)

        allowed = auth_client(self.verifier).get(
            f"/api/requests/{request_id}/"
        )
        self.assertEqual(allowed.status_code, 200)
        data = json.loads(allowed.content)
        self.assertIn("assignments", data)
        self.assertIn("audit_logs", data)

    def test_admin_reassign(self):
        request_id = self.create_request()

        replacement = User.objects.create_user(
            username="flowverifier2",
            email="flowverifier2@test.com",
            password="password123",
            role="VERIFIER",
        )
        assignment = (
            Request.objects.get(id=request_id)
            .assignments.filter(role="VERIFIER", is_active=True)
            .first()
        )

        response = auth_client(self.admin).patch(
            f"/api/requests/{request_id}/reassign/",
            data=json.dumps(
                {"assignment": assignment.id, "user": replacement.id}
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            Request.objects.get(id=request_id).current_verifier,
            replacement,
        )
