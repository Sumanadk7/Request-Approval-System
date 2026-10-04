import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

import Users from "./Users";
import Departments from "./Departments";
import RequestTypes from "./RequestTypes";
import Workflows from "./Workflows";
import Requests from "./Requests";
import AuditLogs from "./AuditLogs";
import Notifications from "./Notifications";

function AdminDashboard() {
  const role = "ADMIN";
  const isAdmin = true;

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [stats, setStats] = useState({
    total_users: 0,
    total_departments: 0,
    total_request_types: 0,
    total_workflows: 0,
    total_requests: 0,
    pending_requests: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/accounts/admin-stats/");

        setStats(response.data);
      } catch (error) {
        console.log("Failed to fetch admin stats:", error);

        setError("Failed to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
          {currentPage === "dashboard" && (
            <>
              <div className="page-title">
                <h1>Admin Dashboard</h1>
                <p>Overview of the Request Approval System.</p>
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "12px 15px",
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    color: "#991b1b",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="dashboard-cards">
                <div className="dashboard-card">
                  <h3>Total Users</h3>
                  <h2>{loading ? "..." : stats.total_users}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Departments</h3>
                  <h2>{loading ? "..." : stats.total_departments}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Request Types</h3>
                  <h2>{loading ? "..." : stats.total_request_types}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Workflows</h3>
                  <h2>{loading ? "..." : stats.total_workflows}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Total Requests</h3>
                  <h2>{loading ? "..." : stats.total_requests}</h2>
                </div>

                <div className="dashboard-card">
                  <h3>Pending Requests</h3>
                  <h2>{loading ? "..." : stats.pending_requests}</h2>
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <h2>System Overview</h2>
                </div>

                <p>
                  Use the sidebar to manage users, departments, request types,
                  workflows, requests, audit logs, and notifications.
                </p>
              </div>
            </>
          )}

          {currentPage === "users" && <Users />}

          {currentPage === "departments" && <Departments />}

          {currentPage === "request-types" && <RequestTypes />}

          {currentPage === "workflows" && <Workflows />}

          {currentPage === "requests" && <Requests />}

          {currentPage === "audit-logs" && <AuditLogs />}

          {currentPage === "notifications" && <Notifications />}

          {currentPage !== "dashboard" &&
            currentPage !== "users" &&
            currentPage !== "departments" &&
            currentPage !== "request-types" &&
            currentPage !== "workflows" &&
            currentPage !== "requests" &&
            currentPage !== "audit-logs" &&
            currentPage !== "notifications" && (
              <div className="page-title">
                <h1>
                  {currentPage
                    .replace("-", " ")
                    .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </h1>

                <p>This section will be available here.</p>
              </div>
            )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
