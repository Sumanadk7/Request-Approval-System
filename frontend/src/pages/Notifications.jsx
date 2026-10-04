import { useEffect, useState } from "react";

import api from "../services/api";

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [error, setError] = useState("");

    const role = localStorage.getItem("role");
    const isAdmin = role === "ADMIN";

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError("");

            const endpoint = isAdmin
                ? "/notifications/admin/"
                : "/notifications/";

            const response = await api.get(endpoint);

            setNotifications(response.data);
        } catch (error) {
            console.log(
                "Failed to fetch notifications:",
                error
            );

            setError("Failed to load notifications.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [isAdmin]);

    const markAsRead = async (id) => {
        try {
            await api.patch(
                `/notifications/${id}/read/`
            );

            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? {
                              ...notification,
                              is_read: true,
                          }
                        : notification
                )
            );
        } catch (error) {
            console.log(
                "Failed to mark notification as read:",
                error
            );
        }
    };

    const markAllAsRead = async () => {
        const unreadNotifications =
            notifications.filter(
                (notification) =>
                    !notification.is_read
            );

        if (unreadNotifications.length === 0) {
            return;
        }

        try {
            setMarkingAll(true);

            await Promise.all(
                unreadNotifications.map(
                    (notification) =>
                        api.patch(
                            `/notifications/${notification.id}/read/`
                        )
                )
            );

            setNotifications((previous) =>
                previous.map((notification) => ({
                    ...notification,
                    is_read: true,
                }))
            );
        } catch (error) {
            console.log(
                "Failed to mark all notifications as read:",
                error
            );

            setError(
                "Failed to mark all notifications as read."
            );
        } finally {
            setMarkingAll(false);
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return "-";
        }

        return new Date(date).toLocaleString();
    };

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    return (
        <>
            <div className="page-title">
                <h1>Notifications</h1>

                <p>
                    View system notifications and important
                    updates.
                </p>
            </div>

            <div className="section">
                <div className="section-header">
                    <div>
                        <h2>Notification List</h2>

                        {!isAdmin &&
                            unreadCount > 0 && (
                                <p
                                    style={{
                                        marginTop: "5px",
                                        fontSize: "12px",
                                    }}
                                >
                                    {unreadCount} unread
                                    notification
                                    {unreadCount !== 1
                                        ? "s"
                                        : ""}
                                </p>
                            )}
                    </div>

                    {!isAdmin &&
                        unreadCount > 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={markAllAsRead}
                                disabled={markingAll}
                            >
                                {markingAll
                                    ? "Marking..."
                                    : "Mark All as Read"}
                            </button>
                        )}
                </div>

                {loading && (
                    <p>Loading notifications...</p>
                )}

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

                {!loading &&
                    !error &&
                    notifications.length === 0 && (
                        <p>
                            No notifications found.
                        </p>
                    )}

                {!loading &&
                    !error &&
                    notifications.length > 0 && (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>

                                        {isAdmin && (
                                            <th>
                                                Receiver
                                            </th>
                                        )}

                                        <th>Message</th>

                                        <th>Status</th>

                                        <th>Created</th>

                                        {!isAdmin && (
                                            <th>
                                                Action
                                            </th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {notifications.map(
                                        (notification) => (
                                            <tr
                                                key={
                                                    notification.id
                                                }
                                                style={{
                                                    backgroundColor:
                                                        notification.is_read
                                                            ? "transparent"
                                                            : "#f8fafc",
                                                }}
                                            >
                                                <td>
                                                    #
                                                    {
                                                        notification.id
                                                    }
                                                </td>

                                                {isAdmin && (
                                                    <td>
                                                        {
                                                            notification.receiver
                                                        }
                                                    </td>
                                                )}

                                                <td>
                                                    {
                                                        notification.message
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={`status ${
                                                            notification.is_read
                                                                ? "read"
                                                                : "unread"
                                                        }`}
                                                    >
                                                        {notification.is_read
                                                            ? "Read"
                                                            : "Unread"}
                                                    </span>
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        notification.created_at
                                                    )}
                                                </td>

                                                {!isAdmin && (
                                                    <td>
                                                        {!notification.is_read ? (
                                                            <button
                                                                className="btn btn-info"
                                                                onClick={() =>
                                                                    markAsRead(
                                                                        notification.id
                                                                    )
                                                                }
                                                            >
                                                                Mark as Read
                                                            </button>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    color: "#9ca3af",
                                                                }}
                                                            >
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>
        </>
    );
}

export default Notifications;