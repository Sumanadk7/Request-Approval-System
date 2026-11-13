import { Fragment, useEffect, useState } from "react";

import api from "../services/api";
import {
  getAttachmentUrl,
  getFileNameFromUrl,
} from "../utils/files";
import Pagination, {
  usePagedList,
} from "../components/Pagination";

function RequestDetail({ requestId, onBack, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acting, setActing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [message, setMessage] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const [allUsers, setAllUsers] = useState([]);
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignUser, setReassignUser] = useState("");

  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  const isAdmin = role === "ADMIN";
  const canViewFlowProgress = isAdmin || role === "APPROVER";
  const isOwner =
    (detail?.created_by || "") === (username || "");

  const timeline = [...(detail?.audit_logs || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const timelinePaged = usePagedList(timeline, 10);

  const routeVerifiers = (detail?.route || [])
    .filter((entry) => entry.role === "VERIFIER")
    .sort((a, b) => a.order - b.order);

  const routeApprovers = (detail?.route || [])
    .filter((entry) => entry.role === "APPROVER")
    .sort((a, b) => a.order - b.order);

  const verifiedUsernames = new Set(
    (detail?.verifier_actions || [])
      .filter((action) => action.action === "VERIFIED")
      .map((action) => action.username)
      .concat(
        (detail?.audit_logs || [])
          .filter((log) => log.action === "VERIFIED" && log.user_name)
          .map((log) => log.user_name),
      ),
  );

  const approvedUsernames = new Set(
    (detail?.approver_actions || [])
      .filter((action) => action.action === "APPROVED")
      .map((action) => action.username)
      .concat(
        (detail?.audit_logs || [])
          .filter((log) => log.action === "APPROVED" && log.user_name)
          .map((log) => log.user_name),
      ),
  );

  const rejectedUsernames = new Set(
    [
      ...(detail?.verifier_actions || []),
      ...(detail?.approver_actions || []),
    ]
      .filter((action) => action.action === "REJECTED")
      .map((action) => action.username)
      .concat(
        (detail?.audit_logs || [])
          .filter((log) => log.action === "REJECTED" && log.user_name)
          .map((log) => log.user_name),
      ),
  );

  const routeNodeState = (node) => {
    if (!detail) {
      return "waiting";
    }

    if (rejectedUsernames.has(node.username)) {
      return "rejected";
    }

    const acted =
      node.role === "VERIFIER"
        ? verifiedUsernames.has(node.username)
        : approvedUsernames.has(node.username);

    if (acted) {
      return "done";
    }

    const inProgress = ["PENDING", "VERIFIED", "DECISION_REQUIRED"].includes(
      detail.status,
    );

    if (!inProgress) {
      return "waiting";
    }

    if (node.role === "VERIFIER") {
      if (detail.status === "PENDING" || detail.status === "DECISION_REQUIRED") {
        if (detail.workflow_verifier_mode === "SEQUENTIAL") {
          return node.username === detail.current_verifier_username
            ? "current"
            : "waiting";
        }

        return "current";
      }

      return "waiting";
    }

    if (detail.status === "VERIFIED" || detail.status === "DECISION_REQUIRED") {
      if (detail.workflow_approver_mode === "SEQUENTIAL") {
        return node.username === detail.current_approver_username
          ? "current"
          : "waiting";
      }

      return "current";
    }

    return "waiting";
  };

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

  const handleDownloadAttachment = async () => {
    const url = getAttachmentUrl(detail?.attachment);

    if (!url) {
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getFileNameFromUrl(url);

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.log("Failed to download attachment:", err);

      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

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
  const canSubmitDraft =
    isOwner && detail.status === "DRAFT" && detail.is_editable;
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
    if (
      canApprove &&
      detail.is_final_approver_step &&
      !message.trim()
    ) {
      setError(
        "As the final approver, enter the next steps for the requester.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${actVerb} request "${detail.title}"?`,
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

  const handleSubmitDraft = async () => {
    const confirmed = window.confirm(
      `Submit request "${detail.title}" now? It will be sent to the verifier immediately and can no longer be edited.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActing(true);
      setError("");
      setSuccess("");

      await api.post(`/requests/${detail.id}/submit/`);

      setSuccess("Request submitted successfully.");
      setMessage("");

      await refresh();
    } catch (err) {
      console.log("Failed to submit draft request:", err);
      setError(
        err.response?.data?.detail || "Failed to submit request.",
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
        <h1>{detail.title}</h1>
        <p>
          {detail.request_type_name} • Submitted by{" "}
          {isOwner ? "You" : detail.created_by || detail.user}
        </p>
      </div>

      {detail.status === "DRAFT" && (
        <div className="draft-notice">
          <strong>Draft request.</strong> This request will be submitted
          automatically on {formatDateTime(detail.action_deadline)}.{" "}
          {isOwner
            ? "You can edit or delete it"
            : "The requester can edit or delete it"}{" "}
          in My Requests until then.
        </div>
      )}

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

      <div className="section document-card">
        <div className="document-header">
          <div>
            <span className="document-eyebrow">Request Document</span>
            <h2>{detail.title}</h2>
            <p className="document-subtitle">
              {detail.request_type_name}
              {detail.department_name
                ? ` • ${detail.department_name}`
                : ""}
            </p>
          </div>

          <span className={`status ${detail.status?.toLowerCase()}`}>
            {detail.status === "DRAFT"
              ? "Draft"
              : detail.status?.replace("_", " ")}
          </span>
        </div>

        <div className="document-meta">
          <div className="document-meta-item">
            <span className="document-meta-label">Request Type</span>
            <span className="document-meta-value">
              {detail.request_type_name || "—"}
            </span>
          </div>

          <div className="document-meta-item">
            <span className="document-meta-label">Department</span>
            <span className="document-meta-value">
              {detail.department_name || "—"}
            </span>
          </div>

          <div className="document-meta-item">
            <span className="document-meta-label">Submitted By</span>
            <span className="document-meta-value">
              {isOwner ? "You" : detail.created_by || detail.user}
            </span>
          </div>

          <div className="document-meta-item">
            <span className="document-meta-label">Submitted On</span>
            <span className="document-meta-value">
              {formatDateTime(detail.created_at)}
            </span>
          </div>

          <div className="document-meta-item">
            <span className="document-meta-label">Last Updated</span>
            <span className="document-meta-value">
              {formatDateTime(detail.updated_at)}
            </span>
          </div>

          <div className="document-meta-item">
            <span className="document-meta-label">
              {detail.status === "DRAFT"
                ? "Auto-submit At"
                : "Action Deadline"}
            </span>
            <span className="document-meta-value">
              {formatDateTime(detail.action_deadline)}
            </span>
          </div>
        </div>

        <div className="document-section">
          <h3>Description</h3>
          <p className="document-description">
            {detail.description || "No description provided."}
          </p>
        </div>

        {detail.request_type_description && (
          <div className="document-section">
            <h3>Request Type Details</h3>
            <p className="document-description">
              {detail.request_type_description}
            </p>
          </div>
        )}

        <div className="document-section">
          <h3>Attachment</h3>

          {detail.attachment ? (
            <div className="attachment-card">
              <div className="attachment-info">
                <span className="attachment-label">Attached file</span>
                <span className="attachment-name">
                  {getFileNameFromUrl(detail.attachment)}
                </span>
              </div>

              <div className="attachment-actions">
                <a
                  href={getAttachmentUrl(detail.attachment)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-info"
                >
                  View
                </a>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadAttachment}
                  disabled={downloading}
                >
                  {downloading ? "Downloading..." : "Download"}
                </button>
              </div>
            </div>
          ) : (
            <p className="muted-text">
              No attachment was provided with this request.
            </p>
          )}
        </div>
      </div>

      {/* ================= WORKFLOW ROUTE ================= */}
      {/* Hierarchy attached to the request document */}

      {detail.route && detail.route.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>Workflow Route</h2>
          </div>

          <p className="route-note">
            This hierarchy was fixed when the request was created. It shows who
            verifies and who approves, and how far the request has progressed.
          </p>

          <div className="route-chain">
            {[
              {
                key: "VERIFIER",
                title: "Verification",
                mode: detail.workflow_verifier_mode,
                nodes: routeVerifiers,
              },
              {
                key: "APPROVER",
                title: "Approval",
                mode: detail.workflow_approver_mode,
                nodes: routeApprovers,
              },
            ].map((group) =>
              group.nodes.length === 0 ? null : (
                <div className="route-group" key={group.key}>
                  <div className="route-group-head">
                    <span className="route-group-title">{group.title}</span>

                    <span className="route-group-mode">
                      {group.mode === "PARALLEL" ? "Parallel" : "Sequential"}
                    </span>
                  </div>

                  <div className="route-nodes">
                    {group.nodes.map((node, index) => {
                      const state = routeNodeState(node);

                      const stateMeta = {
                        done: { icon: "✓", label: "Completed" },
                        rejected: { icon: "✕", label: "Rejected" },
                        current: { icon: "▶", label: "Current step" },
                        waiting: { icon: "○", label: "Pending" },
                      }[state];

                      return (
                        <div
                          className={`route-node route-${state}`}
                          key={`${node.role}-${node.order}-${node.username}`}
                        >
                          <span className="route-marker">
                            {stateMeta.icon}
                          </span>

                          <span className="route-order">
                            {index + 1}.
                          </span>

                          <span className="route-user">
                            {node.username}
                            {node.username === username ? " (you)" : ""}
                          </span>

                          <span className="route-state">
                            {stateMeta.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

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

      {/* ================= SUBMIT DRAFT ================= */}

      {canSubmitDraft && (
        <div className="section">
          <div className="section-header">
            <h2>Submit Request</h2>
          </div>

          <p>
            Review the request details above. Submitting now sends the
            request to the verifier immediately, and it can no longer be
            edited or deleted.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-success"
              disabled={acting}
              onClick={handleSubmitDraft}
            >
              {acting ? "Submitting..." : "Submit Now"}
            </button>
          </div>
        </div>
      )}

      {/* ================= FLOW PROGRESS ================= */}
      {/* Visible to admins and approvers only */}

      {!isOwner && canViewFlowProgress && (
      <div className="section">
        <div className="section-header">
          <h2>Approval Flow Progress</h2>
        </div>

        <div className="workflow-summary">
          <span className="workflow-mode">
            <strong>Verification:</strong>{" "}
            {detail.workflow_verifier_mode === "PARALLEL"
              ? "Parallel"
              : "Sequential"}
          </span>
          <span className="workflow-mode">
            <strong>Approval:</strong>{" "}
            {detail.workflow_approver_mode === "PARALLEL"
              ? "Parallel"
              : "Sequential"}
          </span>
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
              {canApprove && detail.is_final_approver_step
                ? "Next steps for the requester (required)"
                : `Message to requester (optional, sent on ${actVerb})`}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                canApprove && detail.is_final_approver_step
                  ? "Explain what the requester should do next..."
                  : `Explain why you are ${actVerb}ing this request...`
              }
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-success"
              disabled={
                acting ||
                (canApprove &&
                  detail.is_final_approver_step &&
                  !message.trim())
              }
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
            <div className="rejection-box">
              <div className="form-group">
                <label>Rejection reason (required)</label>
                <textarea
                  rows={3}
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  placeholder="Explain clearly why this request is being rejected..."
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={acting || !rejectionMessage.trim()}
                  onClick={handleReject}
                >
                  Confirm Reject
                </button>
              </div>
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
            <Pagination
              page={timelinePaged.page}
              pageCount={timelinePaged.pageCount}
              total={timelinePaged.total}
              setPage={timelinePaged.setPage}
              setPageSize={timelinePaged.setPageSize}
            />

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {timelinePaged.pageItems.map((entry) => (
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
