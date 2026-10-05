import { Fragment, useEffect, useState } from "react";

import api, { API_URL } from "../services/api";

const API_BASE = API_URL.replace(/\/api\/?$/, "");

function RequestDetail({ requestId, onBack, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acting, setActing] = useState(false);

  const [message, setMessage] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const [allUsers, setAllUsers] = useState([]);
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignUser, setReassignUser] = useState("");

  const username = localStorage.getItem("username");
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const isOwner =
    (detail?.created_by || "") === (username || "");

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/requests/${requestId}/`);

      setDetail(response.data);
    } catch (err) {
      console.log("Failed to fetch request detail:", err);
      setError("Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    if (localStorage.getItem("role") === "ADMIN") {
      api
        .get("/accounts/admin-users/")
        .then((response) => setAllUsers(response.data || []))
        .catch((err) =>
          console.log("Failed to fetch users for reassign:", err),
        );
    }
  }, [requestId]);

  if (loading) {
    return (
      <>
        <button type="button" className="btn btn-clear" onClick={onBack}>
          ← Back
        </button>
        <p style={{ marginTop: "15px" }}>Loading request details...</p>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <button type="button" className="btn btn-clear" onClick={onBack}>
          ← Back
        </button>
        <p style={{ marginTop: "15px", color: "#dc2626" }}>
          {error || "Request not found."}
        </p>
      </>
    );
  }

  const canVerify =
    !isAdmin &&
    detail.current_verifier_username === username &&
    (detail.status === "PENDING" || detail.status === "DECISION_REQUIRED");

  const canApprove =
    !isAdmin &&
    detail.current_approver_username === username &&
    (detail.status === "VERIFIED" || detail.status === "DECISION_REQUIRED");

  const canAct = canVerify || canApprove;
  const actVerb = canVerify ? "verify" : "approve";
  const actUrl = canVerify
    ? `/requests/${detail.id}/verify/`
    : `/requests/${detail.id}/approve/`;
  const rejectUrl = canVerify
    ? `/requests/${detail.id}/verifier-reject/`
    : `/requests/${detail.id}/reject/`;
  const messageField = canVerify ? "verification_message" : "approval_message";

  const refresh = async () => {
    await fetchDetail();
    if (onChanged) {
      onChanged();
    }
  };

  const handleAct = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to ${actVerb} request "${detail.title}" (#${detail.id})?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActing(true);
      setError("");
      setSuccess("");

      const payload = {};
      if (message.trim()) {
        payload[messageField] = message.trim();
      }

      await api.patch(actUrl, payload);

      setSuccess(`Request ${actVerb}d successfully.`);
      setMessage("");
      setShowReject(false);
      setRejectionMessage("");

      await refresh();
    } catch (err) {
      console.log(`Failed to ${actVerb} request:`, err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.[0] ||
          `Failed to ${actVerb} request.`,
      );
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionMessage.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    try {
      setActing(true);
      setError("");
      setSuccess("");

      await api.patch(rejectUrl, {
        rejection_message: rejectionMessage.trim(),
      });

      setSuccess("Request rejected.");
      setMessage("");
      setShowReject(false);
      setRejectionMessage("");

      await refresh();
    } catch (err) {
      console.log("Failed to reject request:", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.[0] ||
          "Failed to reject request.",
      );
    } finally {
      setActing(false);
    }
  };

  const verifierAssignments = (detail.assignments || [])
    .filter((a) => a.role === "VERIFIER" && a.is_active)
    .sort((a, b) => a.order - b.order);

  const approverAssignments = (detail.assignments || [])
    .filter((a) => a.role === "APPROVER" && a.is_active)
    .sort((a, b) => a.order - b.order);

  const usersForRole = (role) =>
    allUsers.filter((u) => u.role === role && u.is_active);

  const handleReassign = async (assignment) => {
    if (!reassignUser) {
      setError("Please select a replacement user.");
      return;
    }

    const confirmed = window.confirm(
      `Reassign ${assignment.role} position (order ${assignment.order}) from ${
        assignment.username || "—"
      } to ${
        allUsers.find((u) => String(u.id) === String(reassignUser))
          ?.username || reassignUser
      }?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActing(true);
      setError("");
      setSuccess("");

      await api.patch(`/requests/${detail.id}/reassign/`, {
        assignment: assignment.id,
        user: Number(reassignUser),
      });

      setSuccess("Assignment reassigned successfully.");
      setReassigningId(null);
      setReassignUser("");

      await refresh();
    } catch (err) {
      console.log("Failed to reassign:", err);
      setError(
        err.response?.data?.detail || "Failed to reassign assignment.",
      );
    } finally {
      setActing(false);
    }
  };

  const renderAssignmentRows = (list) =>
    list.map((a) => (
      <Fragment key={a.id}>
        <tr key={a.id}>
          <td>{a.order}</td>
          <td>{a.username || a.user || "—"}</td>
          <td>
            <span
              className={`status ${
                (a.role === "VERIFIER" ? verifiedBy : approvedBy).has(
                  a.username,
                ) && a.username
                  ? "approved"
                  : (a.role === "VERIFIER"
                      ? detail.current_verifier_username
                      : detail.current_approver_username) === a.username
                    ? "pending"
                    : "unread"
              }`}
            >
              {(a.role === "VERIFIER" ? verifiedBy : approvedBy).has(
                a.username,
              ) && a.username
                ? a.role === "VERIFIER"
                  ? "Verified"
                  : "Approved"
                : (a.role === "VERIFIER"
                    ? detail.current_verifier_username
                    : detail.current_approver_username) === a.username
                  ? "Current"
                  : "Waiting"}
            </span>
          </td>
          {isAdmin && (
            <td>
              <button
                type="button"
                className="btn btn-info"
                disabled={acting}
                onClick={() => {
                  setReassigningId(reassigningId === a.id ? null : a.id);
                  setReassignUser("");
                  setError("");
                }}
              >
                Reassign
              </button>
            </td>
          )}
        </tr>

        {isAdmin && reassigningId === a.id && (
          <tr key={`reassign-${a.id}`}>
            <td colSpan={isAdmin ? "4" : "3"}>
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={reassignUser}
                  onChange={(e) => setReassignUser(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select replacement {a.role}</option>
                  {usersForRole(a.role)
                    .filter((u) => u.username !== a.username)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={acting}
                  onClick={() => handleReassign(a)}
                >
                  Confirm
                </button>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    ));

  const verifiedBy = new Set(
    (detail.verifier_actions || []).map((a) => a.username),
  );
  const approvedBy = new Set(
    (detail.approver_actions || []).map((a) => a.username),
  );

  const timeline = [...(detail.audit_logs || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  const formatDateTime = (date) => {
    if (!date) {
      return "—";
    }
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <button type="button" className="btn btn-clear" onClick={onBack}>
        ← Back to Requests
      </button>

      <div className="page-title" style={{ marginTop: "10px" }}>
        <h1>
          #{detail.id} — {detail.title}
        </h1>
        <p>
          {detail.request_type_name} • Submitted by{" "}
          {detail.created_by || detail.user}
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 15px",
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: "7px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 15px",
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: "7px",
          }}
        >
          {success}
        </div>
      )}

      {/* ================= DOCUMENT ================= */}

      <div className="section">
        <div className="section-header">
          <h2>Request Document</h2>
          <span className={`status ${detail.status?.toLowerCase()}`}>
            {detail.status?.replace("_", " ")}
          </span>
        </div>

        <p>
          <strong>Description:</strong>
        </p>
        <p style={{ whiteSpace: "pre-wrap" }}>{detail.description}</p>

        <div className="form-grid" style={{ marginTop: "15px" }}>
          <div>
            <strong>Request Type:</strong> {detail.request_type_name}
          </div>
          <div>
            <strong>Submitted By:</strong>{" "}
            {detail.created_by || detail.user}
          </div>
          <div>
            <strong>Submitted:</strong> {formatDateTime(detail.created_at)}
          </div>
          <div>
            <strong>Last Updated:</strong> {formatDateTime(detail.updated_at)}
          </div>
          <div>
            <strong>Action Deadline:</strong>{" "}
            {formatDateTime(detail.action_deadline)}
          </div>
          <div>
            <strong>Attachment:</strong>{" "}
            {detail.attachment ? (
              <a
                href={`${API_BASE}${detail.attachment}`}
                target="_blank"
                rel="noreferrer"
              >
                View / Download Document
              </a>
            ) : (
              "No attachment"
            )}
          </div>
        </div>
      </div>

      {/* ================= MESSAGES ================= */}

      {(detail.verification_message ||
        detail.approval_message ||
        detail.rejection_message) && (
        <div className="section">
          <div className="section-header">
            <h2>Reviewer Messages</h2>
          </div>

          {detail.verification_message && (
            <p>
              <strong>Verification note:</strong>{" "}
              {detail.verification_message}
            </p>
          )}

          {detail.approval_message && (
            <p>
              <strong>Approval note:</strong> {detail.approval_message}
            </p>
          )}

          {detail.rejection_message && (
            <p>
              <strong>Rejection reason:</strong> {detail.rejection_message}
            </p>
          )}
        </div>
      )}

      {/* ================= FLOW PROGRESS ================= */}
      {/* Hidden from the request owner (user dashboard) */}

      {!isOwner && (
      <div className="section">
        <div className="section-header">
          <h2>Approval Flow Progress</h2>
        </div>

        <h3>
          Verifiers{" "}
          {detail.current_verifier_username &&
            `(current: ${detail.current_verifier_username})`}
        </h3>

        {verifierAssignments.length === 0 ? (
          <p>No verifiers assigned.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Verifier</th>
                  <th>Status</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>{renderAssignmentRows(verifierAssignments)}</tbody>
            </table>
          </div>
        )}

        <h3 style={{ marginTop: "20px" }}>
          Approvers{" "}
          {detail.current_approver_username &&
            `(current: ${detail.current_approver_username})`}
        </h3>

        {approverAssignments.length === 0 ? (
          <p>No approvers assigned.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Approver</th>
                  <th>Status</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>{renderAssignmentRows(approverAssignments)}</tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* ================= ACTION PANEL ================= */}

      {canAct && (
        <div className="section">
          <div className="section-header">
            <h2>Your Review Decision</h2>
          </div>

          <p>
            You are the current{" "}
            {canVerify ? "verifier" : "approver"} for this request. Review the
            document above, optionally write a message to the requester, then
            decide.
          </p>

          <div className="form-group">
            <label>
              Message to requester (optional, sent on {actVerb})
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Explain why you are ${actVerb}ing this request...`}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-success"
              disabled={acting}
              onClick={handleAct}
            >
              {acting
                ? "Working..."
                : actVerb === "verify"
                  ? "Verify"
                  : "Approve"}
            </button>

            <button
              type="button"
              className="btn btn-danger"
              style={{ marginLeft: "8px" }}
              disabled={acting}
              onClick={() => {
                setShowReject(!showReject);
                setRejectionMessage("");
                setError("");
              }}
            >
              Reject
            </button>
          </div>

          {showReject && (
            <div
              style={{ display: "flex", gap: "10px", marginTop: "15px" }}
            >
              <input
                type="text"
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Rejection reason (required)"
                style={{ flex: 1 }}
              />

              <button
                type="button"
                className="btn btn-danger"
                disabled={acting}
                onClick={handleReject}
              >
                Confirm Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TIMELINE ================= */}

      <div className="section">
        <div className="section-header">
          <h2>Activity Timeline</h2>
        </div>

        {timeline.length === 0 ? (
          <p>No activity recorded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>
                      <span
                        className={`status ${entry.action?.toLowerCase()}`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td>{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default RequestDetail;
