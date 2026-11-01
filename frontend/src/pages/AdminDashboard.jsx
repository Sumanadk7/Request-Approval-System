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
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");

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

  const handleNavigate = (page) => {
    if (page === "requests") {
      setRequestStatusFilter("ALL");
    }

    setCurrentPage(page);
  };

  const openRequests = (status) => {
    setRequestStatusFilter(status);
    setCurrentPage("requests");
  };

  const summaryCards = [
    {
      key: "users",
      label: "Total Users",
      value: stats.total_users,
      page: "users",
    },
    {
      key: "departments",
      label: "Departments",
      value: stats.total_departments,
      page: "departments",
    },
    {
      key: "request-types",
      label: "Request Types",
      value: stats.total_request_types,
      page: "request-types",
    },
    {
      key: "workflows",
      label: "Workflows",
      value: stats.total_workflows,
      page: "workflows",
    },
    {
      key: "requests",
      label: "Total Requests",
      value: stats.total_requests,
      status: "ALL",
    },
    {
      key: "pending",
      label: "Pending Requests",
      value: stats.pending_requests,
      status: "PENDING",
    },
  ];

  return (
    <div>
      <Navbar />

      <div className="dashboard-content">
        <Sidebar
          role={role}
          isAdmin={isAdmin}
          onNavigate={handleNavigate}
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
                {summaryCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className="dashboard-card dashboard-card-button admin-stat-card"
                    onClick={() => {
                      if (card.page) {
                        handleNavigate(card.page);
                      } else {
                        openRequests(card.status);
                      }
                    }}
                    aria-label={`Open ${card.label}`}
                  >
                    <h3>{card.label}</h3>
                    <h2>{loading ? "..." : card.value}</h2>

                    <span className="dashboard-card-arrow">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                ))}
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

          {currentPage === "requests" && (
            <Requests
              key={`requests-${requestStatusFilter}`}
              initialStatusFilter={requestStatusFilter}
            />
          )}

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
