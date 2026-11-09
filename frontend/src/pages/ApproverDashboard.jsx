import { Fragment, useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  getAttachmentUrl,
  getFileNameFromUrl,
} from "../utils/files";
import Notifications from "./Notifications";
import RequestDetail from "./RequestDetail";

function ApproverDashboard() {
  const role = "APPROVER";
  const isAdmin = false;
  const username = localStorage.getItem("username");

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actingId, setActingId] = useState(null);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests/list/?scope=all");

      setRequests(response.data);
    } catch (error) {
      console.log("Failed to fetch approver requests:", error);

      setError("Failed to load assigned requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await api.get("/requests/approver-history/");

      setHistory(response.data);
    } catch (error) {
      console.log("Failed to fetch approval history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchHistory();
  }, []);

  const actionByRequest = {};

  history.forEach((entry) => {
    if (entry.request && !actionByRequest[entry.request]) {
      actionByRequest[entry.request] = entry.action;
    }
  });

  const isPending = (request) => {
    if (actionByRequest[request.id]) {
      return false;
    }

    if (
      request.status !== "VERIFIED" &&
      request.status !== "DECISION_REQUIRED"
    ) {
      return false;
    }

    if (request.workflow_approver_mode === "PARALLEL") {
      return (
        request.status === "VERIFIED" ||
        Boolean(request.current_approver_username)
      );
    }

    return request.current_approver_username === username;
  };

  const decisionRequiredRequests = requests.filter(
    (request) =>
      isPending(request) || request.status === "DECISION_REQUIRED",
  );

  const approvedRequests = requests.filter(
    (request) => actionByRequest[request.id] === "APPROVED",
  );

  const rejectedRequests = requests.filter(
    (request) => actionByRequest[request.id] === "REJECTED",
  );

  const summaryCards = [
    {
      key: "ALL",
      label: "Assigned Requests",
      value: requests.length,
    },
    {
      key: "DECISION_REQUIRED",
      label: "Decision Required",
      value: decisionRequiredRequests.length,
    },
    {
      key: "APPROVED",
      label: "Approved by You",
      value: approvedRequests.length,
    },
    {
      key: "REJECTED",
      label: "Rejected by You",
      value: rejectedRequests.length,
    },
  ];

  const activeCard = summaryCards.find(
    (card) => card.key === statusFilter,
  );

  const displayRequests =
    statusFilter === "ALL"
      ? requests
      : statusFilter === "DECISION_REQUIRED"
        ? decisionRequiredRequests
        : statusFilter === "APPROVED"
          ? approvedRequests
          : rejectedRequests;

  const workflowLabel = (request) => {
    if (request.status === "APPROVED") {
      return "Approval complete";
    }

    if (request.status === "REJECTED") {
      return "Rejected";
    }

    if (request.status === "DRAFT") {
      return "Draft";
    }

    if (request.current_verifier_username) {
      const mode =
        request.workflow_verifier_mode === "PARALLEL"
          ? "Parallel"
          : "Sequential";

      return `${mode} verification · step ${request.current_verifier_order}`;
    }

    if (request.current_approver_username) {
      const mode =
        request.workflow_approver_mode === "PARALLEL"
          ? "Parallel"
          : "Sequential";

      return `${mode} approval · step ${request.current_approver_order}`;
    }

    return "—";
  };

  const handleApprove = async (request, nextSteps = "") => {
    const finalMessage = nextSteps.trim();

    if (request.is_final_approver_step && !finalMessage) {
      setError(
        "As the final approver, enter the next steps for the requester.",
      );
      return;
    }

    if (
      !request.is_final_approver_step &&
      !window.confirm(`Approve request "${request.title}"?`)
    ) {
      return;
    }

    try {
      setActingId(request.id);
      setError("");
      setSuccess("");

      await api.patch(
        `/requests/${request.id}/approve/`,
        finalMessage ? { approval_message: finalMessage } : {},
      );

      setSuccess(`Request "${request.title}" approved.`);

      setApprovingId(null);
      setApprovalMessage("");

      await fetchRequests();
      await fetchHistory();
    } catch (error) {
      console.log("Failed to approve request:", error);

      setError(
        error.response?.data?.detail ||
          error.response?.data?.[0] ||
          "Failed to approve request.",
      );
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (request) => {
    if (!rejectionMessage.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    try {
      setActingId(request.id);
      setError("");
      setSuccess("");

      await api.patch(`/requests/${request.id}/reject/`, {
        rejection_message: rejectionMessage.trim(),
      });

      setSuccess(`Request "${request.title}" rejected.`);

      setRejectingId(null);
      setRejectionMessage("");

      await fetchRequests();
      await fetchHistory();
    } catch (error) {
      console.log("Failed to reject request:", error);

      setError(
        error.response?.data?.detail ||
          error.response?.data?.[0] ||
          "Failed to reject request.",
      );
    } finally {
      setActingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString();
  };

  const statsLoading = loading || historyLoading;

  return (
    <div>
      <Navbar isAdmin={isAdmin} onNavigate={setCurrentPage} />

      <div className="dashboard-content">
        <Sidebar
          role={role}
          isAdmin={isAdmin}
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />

        <main>
          {currentPage === "notifications" ? (
            <Notifications />
          ) : selectedRequestId ? (
            <RequestDetail
              requestId={selectedRequestId}
              onBack={() => {
                setSelectedRequestId(null);
                fetchRequests();
                fetchHistory();
              }}
              onChanged={() => {
                fetchRequests();
                fetchHistory();
              }}
            />
          ) : (
            <>
              <div className="page-title">
                <h1>Approver Dashboard</h1>

                <p>Review and approve assigned requests.</p>
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  {success}
                </div>
              )}

              <div className="dashboard-cards">
                {summaryCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className={`dashboard-card dashboard-card-button ${
                      statusFilter === card.key ? "active" : ""
                    }`}
                    onClick={() => setStatusFilter(card.key)}
                    aria-pressed={statusFilter === card.key}
                  >
                    <h3>{card.label}</h3>

                    <h2>{statsLoading ? "..." : card.value}</h2>
                  </button>
                ))}
              </div>

              <div className="section">
                <div className="section-header">
                  <h2>
                    {statusFilter === "ALL"
                      ? "All Assigned Requests"
                      : `${activeCard.label} Requests`}
                  </h2>

                  {statusFilter !== "ALL" && (
                    <button
                      type="button"
                      className="btn btn-clear"
                      onClick={() => setStatusFilter("ALL")}
                    >
                      Show All
                    </button>
                  )}
                </div>

                {loading && <p>Loading assigned requests...</p>}

                {!loading && !error && displayRequests.length === 0 && (
                  <p>
                    No {activeCard.label.toLowerCase()} requests found.
                  </p>
                )}

                {!loading && !error && displayRequests.length > 0 && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>S.N</th>
                          <th>User</th>
                          <th>Request Type</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Workflow</th>
                          <th>Created</th>
                          <th>Attachment</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {displayRequests.map((request, index) => (
                          <Fragment key={request.id}>
                            <tr>
                              <td>{index + 1}</td>

                              <td>
                                {request.created_by || request.user || "—"}
                              </td>

                              <td>
                                {request.request_type_name ||
                                  request.request_type}
                              </td>

                              <td>{request.title}</td>

                              <td>
                                <span
                                  className={`status ${request.status.toLowerCase()}`}
                                >
                                  {request.status.replace("_", " ")}
                                </span>
                              </td>

                              <td>{workflowLabel(request)}</td>

                              <td>{formatDate(request.created_at)}</td>

                              <td>
                                {request.attachment ? (
                                  <a
                                    href={getAttachmentUrl(
                                      request.attachment,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-info"
                                    title={getFileNameFromUrl(
                                      request.attachment,
                                    )}
                                  >
                                    View File
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td>
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className="btn btn-info"
                                    onClick={() =>
                                      setSelectedRequestId(request.id)
                                    }
                                  >
                                    View
                                  </button>

                                  {isPending(request) && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-success"
                                        disabled={
                                          actingId === request.id
                                        }
                                        onClick={() => {
                                          if (
                                            request.is_final_approver_step
                                          ) {
                                            setApprovingId(
                                              approvingId === request.id
                                                ? null
                                                : request.id,
                                            );
                                            setApprovalMessage("");
                                            setRejectingId(null);
                                            setError("");
                                          } else {
                                            handleApprove(request);
                                          }
                                        }}
                                      >
                                        {actingId === request.id
                                          ? "Working..."
                                          : "Approve"}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={
                                          actingId === request.id
                                        }
                                        onClick={() => {
                                          setRejectingId(
                                            rejectingId === request.id
                                              ? null
                                              : request.id,
                                          );
                                          setRejectionMessage("");
                                          setError("");
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {approvingId === request.id && (
                              <tr>
                                <td colSpan="9">
                                  <div className="approval-box">
                                    <div className="form-group">
                                      <label>
                                        Next steps for the requester
                                        (required)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={approvalMessage}
                                        onChange={(e) =>
                                          setApprovalMessage(
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Explain what the requester should do next..."
                                      />
                                    </div>

                                    <div className="form-actions">
                                      <button
                                        type="button"
                                        className="btn btn-success"
                                        disabled={
                                          actingId === request.id ||
                                          !approvalMessage.trim()
                                        }
                                        onClick={() =>
                                          handleApprove(
                                            request,
                                            approvalMessage,
                                          )
                                        }
                                      >
                                        Confirm Approve
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-clear"
                                        onClick={() => {
                                          setApprovingId(null);
                                          setApprovalMessage("");
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {rejectingId === request.id && (
                              <tr>
                                <td colSpan="9">
                                  <div className="rejection-box">
                                    <div className="form-group">
                                      <label>
                                        Rejection reason (required)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={rejectionMessage}
                                        onChange={(e) =>
                                          setRejectionMessage(
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Enter rejection reason (required)"
                                      />
                                    </div>

                                    <div className="form-actions">
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={
                                          actingId === request.id ||
                                          !rejectionMessage.trim()
                                        }
                                        onClick={() =>
                                          handleReject(request)
                                        }
                                      >
                                        Confirm Reject
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-clear"
                                        onClick={() => {
                                          setRejectingId(null);
                                          setRejectionMessage("");
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ApproverDashboard;
