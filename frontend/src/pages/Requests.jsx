import { useEffect, useState } from "react";
import api from "../services/api";

function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests/list/");

      setRequests(response.data);
    } catch (error) {
      console.log("Failed to fetch requests:", error);
      setError("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const renderStatus = (status) => {
    return (
      <span className={`status ${status?.toLowerCase()}`}>
        {status ? status.replace("_", " ") : ""}
      </span>
    );
  };

  return (
    <>
      <div className="page-title">
        <h1>Requests</h1>
        <p>View and manage all requests.</p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>All Requests</h2>
        </div>

        {loading && <p>Loading requests...</p>}

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

        {!loading && !error && requests.length === 0 && <p>No requests found.</p>}

        {!loading && !error && requests.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request Type</th>
                  <th>Title</th>
                  <th>Created By</th>
                  <th>Status</th>
                  <th>Current Verifier</th>
                  <th>Current Approver</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>

                    <td>{request.request_type_name}</td>

                    <td>{request.title}</td>

                    <td>{request.created_by || request.user || "—"}</td>

                    <td>{renderStatus(request.status)}</td>

                    <td>
                      {request.current_verifier_username || "—"}
                    </td>

                    <td>
                      {request.current_approver_username || "—"}
                    </td>

                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
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

export default Requests;
