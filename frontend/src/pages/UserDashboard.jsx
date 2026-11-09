
import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import CreateRequest from "./CreateRequest";
import MyRequests from "./MyRequests";
import Notifications from "./Notifications";

function UserDashboard({ role, isAdmin }) {
    const [currentPage, setCurrentPage] =
        useState("dashboard");

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await api.get(
                    "/requests/list/"
                );

                setRequests(response.data);
            } catch (error) {
                console.log(
                    "Failed to fetch requests:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const totalRequests = requests.length;

    const pendingRequests = requests.filter(
        (request) =>
            request.status === "PENDING"
    ).length;

    const approvedRequests = requests.filter(
        (request) =>
            request.status === "APPROVED"
    ).length;

    const rejectedRequests = requests.filter(
        (request) =>
            request.status === "REJECTED"
    ).length;

    const summaryCards = [
        {
            key: "ALL",
            label: "Total Requests",
            value: totalRequests,
        },
        {
            key: "PENDING",
            label: "Pending",
            value: pendingRequests,
        },
        {
            key: "APPROVED",
            label: "Approved",
            value: approvedRequests,
        },
        {
            key: "REJECTED",
            label: "Rejected",
            value: rejectedRequests,
        },
    ];

    const activeCard = summaryCards.find(
        (card) => card.key === statusFilter
    );

    const filteredRequests =
        statusFilter === "ALL"
            ? requests
            : requests.filter(
                  (request) =>
                      request.status === statusFilter
              );

    const orderedRequests = [...filteredRequests].sort(
        (first, second) =>
            new Date(second.created_at) -
            new Date(first.created_at)
    );

    return (
        <div>
            <Navbar
              hideUsername={currentPage === "my-requests"}
              isAdmin={false}
              onNavigate={setCurrentPage}
            />

            <div className="dashboard-content">
                <Sidebar
                    role={role}
                    isAdmin={isAdmin}
                    onNavigate={setCurrentPage}
                    currentPage={currentPage}
                />

                <main>
                    {currentPage === "create-request" ? (
                        <CreateRequest />
                    ) : currentPage === "my-requests" ? (
                        <MyRequests />
                    ) : currentPage === "notifications" ? (
                        <Notifications />
                    ) : (
                        <>
                            <div className="page-title">
                                <h1>User Dashboard</h1>

                                <p>
                                    Overview of your request
                                    activities.
                                </p>
                            </div>

                            <div className="dashboard-cards">
                                {summaryCards.map((card) => (
                                    <button
                                        key={card.key}
                                        type="button"
                                        className={`dashboard-card dashboard-card-button ${
                                            statusFilter ===
                                            card.key
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setStatusFilter(
                                                card.key
                                            )
                                        }
                                        aria-pressed={
                                            statusFilter ===
                                            card.key
                                        }
                                    >
                                        <h3>{card.label}</h3>

                                        <h2>
                                            {loading
                                                ? "..."
                                                : card.value}
                                        </h2>
                                    </button>
                                ))}
                            </div>

                            <div className="section">
                                <div className="section-header">
                                    <h2>
                                        {statusFilter === "ALL"
                                            ? "Recent Requests"
                                            : `${activeCard.label} Requests`}
                                    </h2>

                                    {statusFilter !== "ALL" && (
                                        <button
                                            type="button"
                                            className="btn btn-clear"
                                            onClick={() =>
                                                setStatusFilter(
                                                    "ALL"
                                                )
                                            }
                                        >
                                            Show All
                                        </button>
                                    )}
                                </div>

                                {requests.length === 0 ? (
                                    <p>
                                        You have no
                                        requests yet.
                                    </p>
                                ) : filteredRequests.length ===
                                  0 ? (
                                    <p>
                                        No{" "}
                                        {activeCard.label.toLowerCase()}{" "}
                                        requests found.
                                    </p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>
                                                        S.N
                                                    </th>

                                                    <th>
                                                        Title
                                                    </th>

                                                    <th>
                                                        Status
                                                    </th>

                                                    <th>
                                                        Created
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {orderedRequests.map(
                                                    (
                                                        request,
                                                        index
                                                    ) => (
                                                        <tr
                                                            key={
                                                                request.id
                                                            }
                                                        >
                                                            <td>
                                                                {index +
                                                                    1}
                                                            </td>

                                                            <td>
                                                                {
                                                                    request.title
                                                                }
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`status ${request.status.toLowerCase()}`}
                                                                >
                                                                    {request.status ===
                                                                    "DRAFT"
                                                                        ? "Draft"
                                                                        : request.status}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {new Date(
                                                                    request.created_at
                                                                ).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
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

export default UserDashboard;