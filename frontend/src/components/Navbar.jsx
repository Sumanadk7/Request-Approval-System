import { useEffect, useState } from "react";

import api from "../services/api";

function Navbar() {
  const [username, setUsername] = useState("User");
  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    window.location.reload();
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
        <div className="brand-logo">NT</div>

        <div>
          <h2>Request Approval System</h2>
          <span>Nepal Telecom</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <strong>{username}</strong>
          <span>Online</span>
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
