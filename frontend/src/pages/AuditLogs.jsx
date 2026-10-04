import { useEffect, useState } from "react";
import api from "../services/api";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit/admin/");

      setLogs(response.data);
    } catch (error) {
      console.log("Failed to fetch audit logs:", error);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <div className="page-title">
        <h1>Audit Logs</h1>
        <p>View system audit trail.</p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Audit Log History</h2>
        </div>

        {loading && <p>Loading audit logs...</p>}

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

        {!loading && !error && logs.length === 0 && <p>No audit logs found.</p>}

        {!loading && !error && logs.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Message</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td>{log.action}</td>
                    <td>{log.user || "-"}</td>
                    <td>{log.message}</td>
                    <td>{formatDate(log.created_at)}</td>
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

export default AuditLogs;
