import { Fragment, useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import Notifications from "./Notifications";
import RequestDetail from "./RequestDetail";

function VerifierDashboard() {
  const role = "VERIFIER";
  const isAdmin = false;

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
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests/list/");

      setRequests(response.data);
    } catch (error) {
      console.log("Failed to fetch verifier requests:", error);

      setError("Failed to load assigned requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await api.get("/requests/verifier-history/");

      setHistory(response.data);
    } catch (error) {
      console.log("Failed to fetch verification history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchHistory();
  }, []);

  const pendingRequests = requests.filter(
    (request) =>
      request.status === "PENDING" || request.status === "DECISION_REQUIRED",
  );

  const verifiedCount = history.filter(
    (entry) => entry.action === "VERIFIED",
  ).length;

  const rejectedCount = history.filter(
    (entry) => entry.action === "REJECTED",
  ).length;

  const handleVerify = async (request) => {
    const confirmed = window.confirm(
      `Verify request "${request.title}" (#${request.id})?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActingId(request.id);
      setError("");
      setSuccess("");

      await api.patch(`/requests/${request.id}/verify/`, {});

      setSuccess(`Request "${request.title}" verified.`);

      await fetchRequests();
      await fetchHistory();
    } catch (error) {
      console.log("Failed to verify request:", error);

      setError(
        error.response?.data?.detail ||
          error.response?.data?.[0] ||
          "Failed to verify request.",
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

      await api.patch(`/requests/${request.id}/verifier-reject/`, {
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

  return (
    <div>
      <Navbar />

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
                <h1>Verifier Dashboard</h1>

                <p>Review and verify assigned requests.</p>
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

              {/* =========================
                  SUMMARY CARDS
                 ========================= */}

              <div className="dashboard-cards">
                <div className="dashboard-card">
                  <h3>Assigned Requests</h3>

                  <h2>{loading ? "..." : requests.length}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Pending Verification</h3>

                  <h2>{loading ? "..." : pendingRequests.length}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Verified by You</h3>

                  <h2>{historyLoading ? "..." : verifiedCount}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Rejected by You</h3>

                  <h2>{historyLoading ? "..." : rejectedCount}</h2>
                </div>
              </div>

              {/* =========================
                  PENDING VERIFICATION
                 ========================= */}

              <div className="section">
                <div className="section-header">
                  <h2>
                    {currentPage === "pending-requests"
                      ? "Pending Requests"
                      : "Requests Requiring Attention"}
                  </h2>
                </div>

                {loading && <p>Loading assigned requests...</p>}

                {!loading && !error && pendingRequests.length === 0 && (
                  <p>No requests are currently waiting for verification.</p>
                )}

                {!loading && !error && pendingRequests.length > 0 && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Request Type</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pendingRequests.map((request) => (
                          <Fragment key={request.id}>
                            <tr>
                              <td>#{request.id}</td>

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

                              <td>{formatDate(request.created_at)}</td>

                              <td>
                                <button
                                  type="button"
                                  className="btn btn-info"
                                  onClick={() =>
                                    setSelectedRequestId(request.id)
                                  }
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-success"
                                  style={{ marginLeft: "8px" }}
                                  disabled={actingId === request.id}
                                  onClick={() => handleVerify(request)}
                                >
                                  {actingId === request.id
                                    ? "Working..."
                                    : "Verify"}
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ marginLeft: "8px" }}
                                  disabled={actingId === request.id}
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
                              </td>
                            </tr>

                            {rejectingId === request.id && (
                              <tr>
                                <td colSpan="7">
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "10px",
                                      alignItems: "center",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      value={rejectionMessage}
                                      onChange={(e) =>
                                        setRejectionMessage(e.target.value)
                                      }
                                      placeholder="Enter rejection reason (required)"
                                      style={{ flex: 1 }}
                                    />

                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      disabled={actingId === request.id}
                                      onClick={() => handleReject(request)}
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

              {/* =========================
                  VERIFICATION HISTORY
                 ========================= */}

              <div className="section">
                <div className="section-header">
                  <h2>My Verification History</h2>
                </div>

                {historyLoading && <p>Loading history...</p>}

                {!historyLoading && history.length === 0 && (
                  <p>You have not taken any verification action yet.</p>
                )}

                {!historyLoading && history.length > 0 && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Action</th>
                          <th>Message</th>
                          <th>Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {history.map((entry) => (
                          <tr key={entry.id}>
                            <td>#{entry.id}</td>

                            <td>
                              <span
                                className={`status ${entry.action?.toLowerCase()}`}
                              >
                                {entry.action}
                              </span>
                            </td>

                            <td>{entry.message}</td>

                            <td>{formatDate(entry.created_at)}</td>
                          </tr>
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

export default VerifierDashboard;
