import { useEffect, useState } from "react";

import api from "../services/api";
import RequestDetail from "./RequestDetail";

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests/list/");

      setRequests(response.data);
    } catch (error) {
      console.log("Failed to fetch my requests:", error);

      setError("Failed to load your requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const renderStatus = (status) => {
    return (
      <span className={`status ${status.toLowerCase()}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

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

        <p>View and track all your submitted requests.</p>
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
                  <th>ID</th>
                  <th>Request Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>

                    <td>{request.request_type_name}</td>

                    <td>{request.title}</td>

                    <td>{renderStatus(request.status)}</td>

                    <td>{new Date(request.created_at).toLocaleDateString()}</td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-info"
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        View
                      </button>
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