
import { useEffect, useState } from "react";

import api from "../services/api";

function Sidebar({ role, isAdmin, onNavigate, currentPage }) {
    const [unreadCount, setUnreadCount] = useState(0);

    const handleNavigate = (page) => {
        if (onNavigate) {
            onNavigate(page);
        }
    };

    const getActiveClass = (page) => {
        return currentPage === page ? "active" : "";
    };

    const fetchUnreadCount = async () => {
        try {
            const endpoint = isAdmin
                ? "/notifications/admin/"
                : "/notifications/";

            const response = await api.get(endpoint);

            const notifications = response.data || [];

            const unread = notifications.filter(
                (notification) => !notification.is_read
            ).length;

            setUnreadCount(unread);
        } catch (error) {
            console.log(
                "Failed to fetch notification count:",
                error
            );
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 10000);

        return () => clearInterval(interval);
    }, [isAdmin]);

    const NotificationMenuItem = () => {
        return (
            <li
                className={getActiveClass("notifications")}
                onClick={() =>
                    handleNavigate("notifications")
                }
            >
                <span className="sidebar-notification-item">
                    <span>Notifications</span>

                    {unreadCount > 0 && (
                        <span className="notification-badge">
                            {unreadCount > 99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}
                </span>
            </li>
        );
    };

    return (
        <aside>
            <h3>Menu</h3>

            {/* =========================
                ADMIN MENU
               ========================= */}

            {isAdmin && (
                <ul>
                    <li
                        className={getActiveClass("dashboard")}
                        onClick={() =>
                            handleNavigate("dashboard")
                        }
                    >
                        Dashboard
                    </li>

                    <li
                        className={getActiveClass("users")}
                        onClick={() =>
                            handleNavigate("users")
                        }
                    >
                        Users
                    </li>

                    <li
                        className={getActiveClass("departments")}
                        onClick={() =>
                            handleNavigate("departments")
                        }
                    >
                        Departments
                    </li>

                    <li
                        className={getActiveClass("request-types")}
                        onClick={() =>
                            handleNavigate("request-types")
                        }
                    >
                        Request Types
                    </li>

                    <li
                        className={getActiveClass("workflows")}
                        onClick={() =>
                            handleNavigate("workflows")
                        }
                    >
                        Workflows
                    </li>

                    <li
                        className={getActiveClass("requests")}
                        onClick={() =>
                            handleNavigate("requests")
                        }
                    >
                        Requests
                    </li>

                    <li
                        className={getActiveClass("audit-logs")}
                        onClick={() =>
                            handleNavigate("audit-logs")
                        }
                    >
                        Audit Logs
                    </li>

                    <NotificationMenuItem />
                </ul>
            )}

            {/* =========================
                USER MENU
               ========================= */}

            {!isAdmin && role === "USER" && (
                <ul>
                    <li
                        className={getActiveClass("dashboard")}
                        onClick={() =>
                            handleNavigate("dashboard")
                        }
                    >
                        Dashboard
                    </li>

                    <li
                        className={getActiveClass("my-requests")}
                        onClick={() =>
                            handleNavigate("my-requests")
                        }
                    >
                        My Requests
                    </li>

                    <li
                        className={getActiveClass("create-request")}
                        onClick={() =>
                            handleNavigate("create-request")
                        }
                    >
                        Create Request
                    </li>

                    <NotificationMenuItem />
                </ul>
            )}

            {/* =========================
                VERIFIER MENU
               ========================= */}

            {!isAdmin && role === "VERIFIER" && (
                <ul>
                    <li
                        className={getActiveClass("dashboard")}
                        onClick={() =>
                            handleNavigate("dashboard")
                        }
                    >
                        Dashboard
                    </li>

                    <li
                        className={getActiveClass("pending-requests")}
                        onClick={() =>
                            handleNavigate("pending-requests")
                        }
                    >
                        Pending Requests
                    </li>

                    <NotificationMenuItem />
                </ul>
            )}

            {/* =========================
                APPROVER MENU
               ========================= */}

            {!isAdmin && role === "APPROVER" && (
                <ul>
                    <li
                        className={getActiveClass("dashboard")}
                        onClick={() =>
                            handleNavigate("dashboard")
                        }
                    >
                        Dashboard
                    </li>

                    <li
                        className={getActiveClass("pending-approvals")}
                        onClick={() =>
                            handleNavigate("pending-approvals")
                        }
                    >
                        Pending Approvals
                    </li>

                    <NotificationMenuItem />
                </ul>
            )}
        </aside>
    );
}

export default Sidebar;
