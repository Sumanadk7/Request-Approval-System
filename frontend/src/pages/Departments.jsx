import { useEffect, useState } from "react";

import api from "../services/api";

function Departments() {
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/departments/");
      setDepartments(response.data);
    } catch (error) {
      console.log("Failed to fetch departments:", error);
      setError("Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }

    try {
      await api.post("/departments/", {
        name: name.trim(),
      });

      setSuccess("Department created successfully.");
      setName("");
      setShowForm(false);

      await fetchDepartments();
    } catch (error) {
      console.log("Failed to create department:", error);

      const message =
        error.response?.data?.name?.[0] ||
        error.response?.data?.detail ||
        "Failed to create department.";

      setError(message);
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(`/departments/${department.id}/`);

      setSuccess("Department deleted successfully.");

      await fetchDepartments();
    } catch (error) {
      console.log("Failed to delete department:", error);

      const message =
        error.response?.data?.detail || "Failed to delete department.";

      setError(message);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Departments</h1>
        <p>Manage departments in the system.</p>
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
          <h2>Department Management</h2>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
          >
            {showForm ? "Cancel" : "Add Department"}
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
            <div className="form-group">
              <label>Department Name</label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter department name"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Department
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p>Loading departments...</p>
        ) : departments.length === 0 ? (
          <p>No departments found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Department Name</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td>#{department.id}</td>

                    <td>{department.name}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleDelete(department)}
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

export default Departments;
