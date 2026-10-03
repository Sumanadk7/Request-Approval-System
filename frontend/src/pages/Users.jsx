import { useEffect, useState } from "react";

import api from "../services/api";

function Users() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim() || !password) {
      setError("Username, email and password are required.");
      return;
    }

    try {
      await api.post("/accounts/admin-users/", {
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        is_active: isActive,
        is_staff: false,
      });

      setSuccess("User created successfully.");

      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("USER");
      setIsActive(true);
      setShowForm(false);

      await fetchUsers();
    } catch (error) {
      console.log("Failed to create user:", error);

      const message =
        error.response?.data?.username?.[0] ||
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.detail ||
        "Failed to create user.";

      setError(message);
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

  return (
    <>
      <div className="page-title">
        <h1>Users</h1>
        <p>Manage system users and their roles.</p>
      </div>

      {success && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 15px",
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: "5px",
          }}
        >
          {success}
        </div>
      )}

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

      <div className="section">
        <div
          className="section-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>User Management</h2>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
          >
            {showForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              marginBottom: "25px",
              padding: "20px",
              border: "1px solid #e1e5ea",
              borderRadius: "6px",
            }}
          >
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
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
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
              <button type="submit" className="btn btn-primary">
                Create User
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
            <table>
              <thead>
                <tr>
                  <th>ID</th>
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "—"}</td>
                    <td>{user.role}</td>
                    <td>{user.is_active ? "Active" : "Inactive"}</td>
                    <td>{user.is_staff ? "Yes" : "No"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        style={{
                          marginLeft: "8px",
                        }}
                      >
                        Delete
                      </button>
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
