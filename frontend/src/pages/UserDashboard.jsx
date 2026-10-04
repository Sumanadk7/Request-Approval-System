
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
                                <div className="dashboard-card">
                                    <h3>
                                        Total Requests
                                    </h3>

                                    <h2>
                                        {loading
                                            ? "..."
                                            : totalRequests}
                                    </h2>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Pending</h3>

                                    <h2>
                                        {loading
                                            ? "..."
                                            : pendingRequests}
                                    </h2>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Approved</h3>

                                    <h2>
                                        {loading
                                            ? "..."
                                            : approvedRequests}
                                    </h2>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Rejected</h3>

                                    <h2>
                                        {loading
                                            ? "..."
                                            : rejectedRequests}
                                    </h2>
                                </div>
                            </div>

                            <div className="section">
                                <div className="section-header">
                                    <h2>
                                        Recent Requests
                                    </h2>
                                </div>

                                {requests.length === 0 ? (
                                    <p>
                                        You have no
                                        requests yet.
                                    </p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>
                                                        ID
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
                                                {requests.map(
                                                    (
                                                        request
                                                    ) => (
                                                        <tr
                                                            key={
                                                                request.id
                                                            }
                                                        >
                                                            <td>
                                                                #
                                                                {
                                                                    request.id
                                                                }
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
                                                                    {
                                                                        request.status
                                                                    }
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