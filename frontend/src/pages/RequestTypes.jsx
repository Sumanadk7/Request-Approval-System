import { useEffect, useState } from "react";

import api from "../services/api";

function RequestTypes() {
  const [requestTypes, setRequestTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");

  const [departments, setDepartments] = useState([]);

  const fetchRequestTypes = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/request-types/");
      setRequestTypes(response.data);
    } catch (error) {
      console.log("Failed to fetch request types:", error);
      setError("Failed to load request types.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments/");
      setDepartments(response.data);
    } catch (error) {
      console.log("Failed to fetch departments:", error);
    }
  };

  useEffect(() => {
    fetchRequestTypes();
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim() || !department) {
      setError("Request type name and department are required.");
      return;
    }

    try {
      await api.post("/request-types/", {
        name: name.trim(),
        description: description.trim(),
        department: department,
      });

      setSuccess("Request type created successfully.");

      setName("");
      setDescription("");
      setDepartment("");
      setShowForm(false);

      await fetchRequestTypes();
    } catch (error) {
      console.log("Failed to create request type:", error);

      const message =
        error.response?.data?.name?.[0] ||
        error.response?.data?.department?.[0] ||
        error.response?.data?.detail ||
        "Failed to create request type.";

      setError(message);
    }
  };

  const handleDelete = async (requestType) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${requestType.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(`/request-types/${requestType.id}/`);

      setSuccess("Request type deleted successfully.");

      await fetchRequestTypes();
    } catch (error) {
      console.log("Failed to delete request type:", error);

      const message =
        error.response?.data?.detail || "Failed to delete request type.";

      setError(message);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Request Types</h1>
        <p>Manage request types used in the approval system.</p>
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
          <h2>Request Type Management</h2>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
          >
            {showForm ? "Cancel" : "Add Request Type"}
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
                <label>Request Type Name</label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter request type name"
                />
              </div>

              <div className="form-group">
                <label>Department</label>

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>

                  {departments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full">
                <label>Description</label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this request type..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Request Type
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p>Loading request types...</p>
        ) : requestTypes.length === 0 ? (
          <p>No request types found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requestTypes.map((requestType) => (
                  <tr key={requestType.id}>
                    <td>#{requestType.id}</td>

                    <td>{requestType.name}</td>

                    <td>{requestType.description || "—"}</td>

                    <td>
                      {requestType.department_name ||
                        requestType.department ||
                        "—"}
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleDelete(requestType)}
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

export default RequestTypes;
