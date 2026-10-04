import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import Notifications from "./Notifications";

function VerifierDashboard() {
  const role = "VERIFIER";
  const isAdmin = false;

  const [currentPage, setCurrentPage] = useState("dashboard");

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
      console.log("Failed to fetch verifier requests:", error);

      setError("Failed to load assigned requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = requests.filter(
    (request) =>
      request.status === "PENDING" || request.status === "DECISION_REQUIRED",
  );

  const verifiedRequests = requests.filter(
    (request) => request.status === "VERIFIED",
  );

  const rejectedRequests = requests.filter(
    (request) => request.status === "REJECTED",
  );

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
                  <h3>Verified</h3>

                  <h2>{loading ? "..." : verifiedRequests.length}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Rejected</h3>

                  <h2>{loading ? "..." : rejectedRequests.length}</h2>
                </div>
              </div>

              {/* =========================
                                REQUEST LIST
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
                        </tr>
                      </thead>

                      <tbody>
                        {pendingRequests.map((request) => (
                          <tr key={request.id}>
                            <td>#{request.id}</td>

                            <td>{request.user}</td>

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

                            <td>
                              {new Date(
                                request.created_at,
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* =========================
                                VERIFIER INFORMATION
                               ========================= */}

              <div className="section">
                <div className="section-header">
                  <h2>Verifier Responsibilities</h2>
                </div>

                <p>
                  Review requests assigned to you, verify the submitted
                  information, and make the appropriate verification decision.
                </p>

                <p>
                  Requests requiring your action will appear under Pending
                  Requests.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default VerifierDashboard;
