import { useEffect, useState } from "react";

import api from "../services/api";
import Pagination, {
  usePagedList,
} from "../components/Pagination";

function Users() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("USER");
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/accounts/admin-users/");
      setUsers(response.data);
    } catch (error) {
      console.log("Failed to fetch users:", error);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setUsername("");
    setEmail("");
    setPhone("");
    setPassword("");
    setEmployeeId("");
    setRole("USER");
    setIsActive(true);
    setShowForm(false);
  };

  const handleEditClick = (user) => {
    setEditingId(user.id);
    setUsername(user.username);
    setEmail(user.email);
    setPhone(user.phone || "");
    setPassword("");
    setEmployeeId(
      user.employee_id !== null && user.employee_id !== undefined
        ? String(user.employee_id)
        : "",
    );
    setRole(user.role);
    setIsActive(user.is_active);
    setShowForm(true);
    setError("");
    setSuccess("");

    setTimeout(() => {
      document
        .getElementById("user-form-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim()) {
      setError("Username and email are required.");
      return;
    }

    if (!editingId && !password) {
      setError("Password is required for new users.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        is_active: isActive,
        is_staff: false,
      };

      if (employeeId !== "") {
        payload.employee_id = employeeId;
      }

      if (editingId) {
        if (password) {
          payload.password = password;
        }

        await api.patch(
          `/accounts/admin-users/${editingId}/`,
          payload,
        );

        setSuccess("User updated successfully.");
      } else {
        payload.password = password;

        await api.post("/accounts/admin-users/", payload);

        setSuccess("User created successfully.");
      }

      resetForm();

      await fetchUsers();
    } catch (error) {
      console.log("Failed to save user:", error);

      const data = error.response?.data || {};

      const firstMessage = (value) =>
        Array.isArray(value) ? String(value[0]) : value;

      const message =
        firstMessage(data.username) ||
        firstMessage(data.email) ||
        firstMessage(data.password) ||
        firstMessage(data.employee_id) ||
        data.detail ||
        "Failed to save user.";

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      setError("");
      setSuccess("");

      await api.patch(`/accounts/admin-users/${user.id}/`, {
        is_active: !user.is_active,
      });

      setSuccess(
        `User "${user.username}" has been ${
          user.is_active ? "deactivated" : "activated"
        }.`,
      );

      await fetchUsers();
    } catch (error) {
      console.log("Failed to update user:", error);
      setError("Failed to update user.");
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${user.username}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(`/accounts/admin-users/${user.id}/`);

      setSuccess("User deleted successfully.");

      await fetchUsers();
    } catch (error) {
      console.log("Failed to delete user:", error);
      setError("Failed to delete user.");
    }
  };

  const paged = usePagedList(users, 10);

  return (
    <>
      <div className="page-title">
        <h1>Users</h1>
        <p>Manage system users, roles and employee IDs.</p>
      </div>

      {success && (
        <div className="alert alert-success">{success}</div>
      )}

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="section">
        <div className="section-header">
          <h2>User Management</h2>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
                setError("");
                setSuccess("");
              }
            }}
          >
            {showForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {showForm && (
          <form
            id="user-form-panel"
            onSubmit={handleSubmit}
            style={{
              marginBottom: "25px",
              padding: "20px",
              border: "1px solid #e1e5ea",
              borderRadius: "6px",
            }}
          >
            <h3>
              {editingId ? "Edit User" : "Add New User"}
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>Employee ID (0000-9999)</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={
                    editingId
                      ? "Current ID shown above"
                      : "Auto-assigned if left blank"
                  }
                  maxLength={4}
                />
              </div>

              <div className="form-group">
                <label>
                  {editingId
                    ? "New Password (blank = keep current)"
                    : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    editingId
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="USER">User</option>
                  <option value="VERIFIER">Verifier</option>
                  <option value="APPROVER">Approver</option>
                </select>
              </div>

              <div className="form-group">
                <label>Account Status</label>
                <select
                  value={isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setIsActive(e.target.value === "ACTIVE")}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update User"
                    : "Create User"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="table-wrapper">
            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              total={paged.total}
              setPage={paged.setPage}
              setPageSize={paged.setPageSize}
            />

            <table>
              <thead>
                <tr>
                  <th>S.N</th>
                  <th>Employee ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Admin</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paged.pageItems.map((user, index) => (
                  <tr key={user.id}>
                    <td>{paged.absoluteIndex(index)}</td>
                    <td>{user.employee_id_display || "—"}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "—"}</td>
                    <td>{user.role}</td>
                    <td>
                      <span
                        className={`status ${
                          user.is_active ? "approved" : "rejected"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{user.is_staff ? "Yes" : "No"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            user.is_active
                              ? "btn btn-danger"
                              : "btn btn-success"
                          }
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default Users;
