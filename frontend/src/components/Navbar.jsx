import { useEffect, useRef, useState } from "react";

import api from "../services/api";

import ntcLogo from "../assets/ntc-logo.jpg";

function getDotClass(message) {
  const text = (message || "").toLowerCase();

  if (
    text.includes("approved") ||
    text.includes("verified")
  ) {
    return "success";
  }

  if (text.includes("rejected")) {
    return "danger";
  }

  return "info";
}

function Navbar({
  hideUsername = false,
  onNavigate = null,
  isAdmin = false,
}) {
  const [username, setUsername] = useState("User");
  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] =
    useState([]);
  const [showBell, setShowBell] = useState(false);

  const bellRef = useRef(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const endpoint = isAdmin
        ? "/notifications/admin/"
        : "/notifications/";

      const response = await api.get(endpoint);

      const notifications = response.data || [];

      setUnreadCount(
        notifications.filter(
          (notification) => !notification.is_read,
        ).length,
      );

      setRecentNotifications(notifications.slice(0, 5));
    } catch (error) {
      console.log(
        "Failed to fetch navbar notifications:",
        error,
      );
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (!showBell) {
      return undefined;
    }

    const handleClick = (event) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowBell(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, [showBell]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    window.location.reload();
  };

  const handleBellClick = () => {
    setShowBell((previous) => !previous);
    fetchNotifications();
  };

  const handleViewAll = () => {
    setShowBell(false);

    if (onNavigate) {
      onNavigate("notifications");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!oldPassword || !newPassword) {
      setFormError("Both fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/accounts/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setFormSuccess("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch (error) {
      setFormError(
        error.response?.data?.detail || "Failed to change password.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">
          <img src={ntcLogo} alt="Nepal Telecom" />
        </div>

        <div>
          <h2>Request Approval System</h2>
          <span>Nepal Telecom</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="user-info">
          {!hideUsername && <strong>{username}</strong>}
          <span>Online</span>
        </div>

        <div className="navbar-bell" ref={bellRef}>
          <button
            type="button"
            className={`navbar-bell-button ${
              showBell ? "active" : ""
            }`}
            onClick={handleBellClick}
            title="Notifications"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#005baa"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {unreadCount > 0 && (
              <span className="bell-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showBell && (
            <div className="navbar-bell-panel">
              <div className="bell-panel-head">
                <strong>Notifications</strong>

                {unreadCount > 0 && (
                  <span className="bell-count">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="bell-panel-body">
                {recentNotifications.length === 0 ? (
                  <p className="bell-empty">
                    No notifications yet.
                  </p>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`bell-item ${
                        notification.is_read ? "read" : "unread"
                      }`}
                    >
                      <span
                        className={`bell-dot ${getDotClass(
                          notification.message,
                        )}`}
                      />

                      <div>
                        <p>{notification.message}</p>

                        <span>
                          {new Date(
                            notification.created_at,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                className="bell-view-all"
                onClick={handleViewAll}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "Password"}
        </button>

        <button onClick={handleLogout}>Logout</button>
      </div>

      {showForm && (
        <form
          onSubmit={handleChangePassword}
          style={{
            position: "absolute",
            top: "70px",
            right: "20px",
            zIndex: 1001,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "18px",
            width: "300px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
          }}
        >
          <h4 style={{ margin: "0 0 12px", color: "#12304a" }}>
            Change Password
          </h4>

          <div className="login-field">
            <label>Old password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="login-field">
            <label>New password (min 8 chars)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {formError && (
            <div className="login-error">{formError}</div>
          )}

          {formSuccess && (
            <div
              style={{
                marginBottom: "15px",
                padding: "11px 13px",
                border: "1px solid #86efac",
                borderRadius: "7px",
                background: "#f0fdf4",
                color: "#166534",
                fontSize: "13px",
              }}
            >
              {formSuccess}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Change Password"}
          </button>
        </form>
      )}
    </nav>
  );
}

export default Navbar;
