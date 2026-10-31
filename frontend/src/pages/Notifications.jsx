import { useEffect, useState } from "react";

import api from "../services/api";

const PAGE_SIZE = 20;

const timeAgo = (date) => {
  if (!date) {
    return "";
  }

  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString();
};

const getTone = (message) => {
  const text = (message || "").toLowerCase();

  if (text.includes("reject")) {
    return "danger";
  }

  if (text.includes("approve")) {
    return "success";
  }

  if (text.includes("verif")) {
    return "info";
  }

  if (
    text.includes("assign") ||
    text.includes("deadline") ||
    text.includes("await")
  ) {
    return "warning";
  }

  return "neutral";
};

const NotificationIcon = ({ tone }) => {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (tone === "success") {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (tone === "danger") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }

  if (tone === "info") {
    return (
      <svg {...common}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
};

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [receiverNames, setReceiverNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const role = localStorage.getItem("role");
  const isAdmin = role === "ADMIN";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint = isAdmin ? "/notifications/admin/" : "/notifications/";

      const response = await api.get(endpoint);

      setNotifications(response.data);
    } catch (error) {
      console.log("Failed to fetch notifications:", error);

      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    api
      .get("/accounts/admin-users/")
      .then((response) => {
        const names = {};

        (response.data || []).forEach((user) => {
          names[user.id] = user.username;
        });

        setReceiverNames(names);
      })
      .catch((error) =>
        console.log("Failed to load receiver names:", error),
      );
  }, [isAdmin]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.log("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.is_read,
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await Promise.all(
        unreadNotifications.map((notification) =>
          api.patch(`/notifications/${notification.id}/read/`),
        ),
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
    } catch (error) {
      console.log("Failed to mark all notifications as read:", error);

      setError("Failed to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const changeFilter = (nextFilter) => {
    setFilter(nextFilter);
    setVisibleCount(PAGE_SIZE);
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString();
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "UNREAD") {
      return !notification.is_read;
    }

    if (filter === "READ") {
      return notification.is_read;
    }

    return true;
  });

  const visibleNotifications = filteredNotifications.slice(
    0,
    visibleCount,
  );

  const filters = [
    {
      key: "ALL",
      label: "All",
      count: notifications.length,
    },
    {
      key: "UNREAD",
      label: "Unread",
      count: unreadCount,
    },
    {
      key: "READ",
      label: "Read",
      count: readCount,
    },
  ];

  return (
    <>
      <div className="page-title">
        <h1>Notifications</h1>

        <p>View system notifications and important updates.</p>
      </div>

      <div className="section">
        <div className="section-header">
          <div>
            <h2>Notification List</h2>

            <p style={{ marginTop: "5px", fontSize: "12px" }}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount !== 1 ? "s" : ""
                  }`
                : "You are all caught up."}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? "Marking..." : "Mark All as Read"}
            </button>
          )}
        </div>

        {loading && <p>Loading notifications...</p>}

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

        {!loading && !error && (
          <>
            <div className="notification-toolbar">
              <div className="notification-filters">
                {filters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`notification-filter ${
                      filter === item.key ? "active" : ""
                    }`}
                    onClick={() => changeFilter(item.key)}
                  >
                    {item.label}

                    <span className="notification-filter-count">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {notifications.length > 0 && (
                <span className="notification-showing">
                  Showing {visibleNotifications.length} of{" "}
                  {filteredNotifications.length}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="notification-empty">
                <strong>No notifications yet</strong>
                <p>
                  Updates about your requests will appear here.
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <strong>
                  No {filter.toLowerCase()} notifications
                </strong>
                <p>Try selecting a different filter.</p>
              </div>
            ) : (
              <ul className="notification-list">
                {visibleNotifications.map((notification) => {
                  const tone = getTone(notification.message);

                  return (
                    <li
                      key={notification.id}
                      className={`notification-card ${
                        notification.is_read ? "read" : "unread"
                      } tone-${tone}`}
                    >
                      <span
                        className={`notification-icon tone-${tone}`}
                      >
                        <NotificationIcon tone={tone} />
                      </span>

                      <div className="notification-main">
                        <div className="notification-top">
                          <p className="notification-message">
                            {notification.message}
                          </p>

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
                        </div>

                        <div className="notification-meta">
                          {isAdmin && (
                            <span className="notification-receiver">
                              To:{" "}
                              {receiverNames[
                                notification.receiver
                              ] ||
                                `User #${notification.receiver}`}
                            </span>
                          )}

                          <span
                            title={formatDate(
                              notification.created_at,
                            )}
                          >
                            {timeAgo(notification.created_at)}
                          </span>

                          <span className="notification-exact">
                            {formatDate(
                              notification.created_at,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="notification-action">
                        {!notification.is_read && (
                          <button
                            className="btn btn-info"
                            onClick={() =>
                              markAsRead(notification.id)
                            }
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {visibleCount < filteredNotifications.length && (
              <div className="notification-more">
                <button
                  type="button"
                  className="btn btn-clear"
                  onClick={() =>
                    setVisibleCount(
                      (previous) => previous + PAGE_SIZE,
                    )
                  }
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default Notifications;
