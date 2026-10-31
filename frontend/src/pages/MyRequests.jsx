import { useEffect, useState } from "react";

import api from "../services/api";
import EditRequest from "./EditRequest";
import RequestDetail from "./RequestDetail";

const formatRemaining = (deadline, now) => {
  if (!deadline) {
    return "";
  }

  const remaining = new Date(deadline).getTime() - now;

  if (remaining <= 0) {
    return "Submitting...";
  }

  const totalMinutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/requests/list/");

      setRequests(response.data);
    } catch (error) {
      console.log("Failed to fetch my requests:", error);

      if (!silent) {
        setError("Failed to load your requests.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRequests();

    const tick = setInterval(() => setNow(Date.now()), 30000);
    const refresh = setInterval(() => fetchRequests(true), 60000);

    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, []);

  const renderStatus = (status) => {
    return (
      <span className={`status ${status.toLowerCase()}`}>
        {status === "DRAFT" ? "Draft" : status.replace("_", " ")}
      </span>
    );
  };

  const handleDelete = async (request) => {
    const confirmed = window.confirm(
      `Delete draft "${request.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/requests/${request.id}/draft/`);

      await fetchRequests(true);
    } catch (err) {
      console.log("Failed to delete draft:", err);

      setError(
        err.response?.data?.detail || "Failed to delete the draft request.",
      );
    }
  };

  const orderedRequests = [...requests].sort(
    (first, second) =>
      new Date(second.created_at) - new Date(first.created_at),
  );

  if (editingRequestId) {
    return (
      <EditRequest
        requestId={editingRequestId}
        onDone={() => {
          setEditingRequestId(null);
          fetchRequests();
        }}
        onCancel={() => setEditingRequestId(null)}
      />
    );
  }

  if (selectedRequestId) {
    return (
      <RequestDetail
        requestId={selectedRequestId}
        onBack={() => {
          setSelectedRequestId(null);
          fetchRequests();
        }}
        onChanged={fetchRequests}
      />
    );
  }

  return (
    <>
      <div className="page-title">
        <h1>My Requests</h1>

        <p>
          View and track all your requests. Drafts can be edited or
          deleted for 24 hours before they are submitted automatically.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Request History</h2>
        </div>

        {loading && <p>Loading your requests...</p>}

        {error && (
          <p
            style={{
              color: "#dc2626",
              marginBottom: "15px",
            }}
          >
            {error}
          </p>
        )}

        {!loading && !error && requests.length === 0 && (
          <p>You have not submitted any requests yet.</p>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>S.N</th>
                  <th>Request Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {orderedRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>

                    <td>{request.request_type_name}</td>

                    <td>{request.title}</td>

                    <td>
                      {renderStatus(request.status)}

                      {request.status === "DRAFT" && (
                        <div className="draft-countdown">
                          Auto-submits in{" "}
                          {formatRemaining(request.action_deadline, now)}
                        </div>
                      )}
                    </td>

                    <td>{new Date(request.created_at).toLocaleDateString()}</td>

                    <td>
                      <div className="table-actions">
                        {request.is_editable ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() =>
                                setSelectedRequestId(request.id)
                              }
                            >
                              Review &amp; Submit
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => setEditingRequestId(request.id)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleDelete(request)}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-info"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
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

export default MyRequests;
