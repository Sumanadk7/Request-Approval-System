import { useEffect, useState } from "react";
import api from "../services/api";
import Pagination, {
  usePagedList,
} from "../components/Pagination";

const ACTION_OPTIONS = [
  { value: "ALL", label: "All actions" },
  { value: "CREATED", label: "Created" },
  { value: "UPDATED", label: "Updated" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "REASSIGNED", label: "Reassigned" },
];

const RANGE_OPTIONS = [
  { value: "ALL", label: "All time" },
  { value: "TODAY", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [rangeFilter, setRangeFilter] = useState("ALL");

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

  const now = new Date();
  const todayKey = now.toDateString();
  const todayCount = logs.filter(
    (log) => new Date(log.created_at).toDateString() === todayKey,
  ).length;
  const activeUsers = new Set(
    logs.map((log) => log.user_name || log.user).filter(Boolean),
  ).size;
  const latestLog = logs[0];
  const hasFilters =
    search.trim() !== "" ||
    actionFilter !== "ALL" ||
    rangeFilter !== "ALL";

  const filteredLogs = logs.filter((log) => {
    const query = search.trim().toLowerCase();
    const searchable = [
      log.action,
      log.user,
      log.user_name,
      log.message,
      log.request_title,
      log.request_type_name,
      log.request_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = query === "" || searchable.includes(query);
    const matchesAction =
      actionFilter === "ALL" || log.action === actionFilter;

    let matchesRange = true;

    if (rangeFilter === "TODAY") {
      matchesRange =
        new Date(log.created_at).toDateString() === todayKey;
    } else if (rangeFilter !== "ALL") {
      const days = Number(rangeFilter);
      matchesRange =
        now.getTime() - new Date(log.created_at).getTime() <=
        days * 86400000;
    }

    return matchesSearch && matchesAction && matchesRange;
  });

  const logPaged = usePagedList(filteredLogs, 10);

  const resetFilters = () => {
    setSearch("");
    setActionFilter("ALL");
    setRangeFilter("ALL");
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }
    return new Date(date).toLocaleString();
  };

  const formatRelative = (date) => {
    if (!date) {
      return "No activity";
    }

    const diff = now.getTime() - new Date(date).getTime();

    if (diff < 60000) {
      return "Just now";
    }

    const minutes = Math.floor(diff / 60000);

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

  const renderAction = (action) => {
    return (
      <span className={`status ${action?.toLowerCase()}`}>
        {action}
      </span>
    );
  };

  return (
    <>
      <div className="page-title">
        <h1>Audit Logs</h1>

        <p>Track every action across the system.</p>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Total Activity</h3>
          <h2>{loading ? "..." : logs.length}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Today's Events</h3>
          <h2>{loading ? "..." : todayCount}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Active Users</h3>
          <h2>{loading ? "..." : activeUsers}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Latest Activity</h3>
          <h2>
            {loading
              ? "..."
              : latestLog
                ? formatRelative(latestLog.created_at)
                : "No activity"}
          </h2>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Audit Trail</h2>

          <div className="request-filter">
            <label htmlFor="audit-search">Search</label>

            <input
              id="audit-search"
              type="text"
              className="request-filter-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, user, request..."
            />

            <label htmlFor="audit-action-filter">Action</label>

            <select
              id="audit-action-filter"
              className="request-filter-select"
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value)
              }
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="audit-range-filter">Period</label>

            <select
              id="audit-range-filter"
              className="request-filter-select"
              value={rangeFilter}
              onChange={(event) =>
                setRangeFilter(event.target.value)
              }
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                className="btn btn-clear"
                onClick={resetFilters}
              >
                Reset
              </button>
            )}

            <span className="request-filter-count">
              {filteredLogs.length}{" "}
              {filteredLogs.length === 1 ? "event" : "events"}
            </span>
          </div>
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

        {!loading && !error && filteredLogs.length === 0 && (
          <p>
            {logs.length === 0
              ? "No audit logs found."
              : "No logs match the selected filter."}
          </p>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <div className="table-wrapper">
            <Pagination
              page={logPaged.page}
              pageCount={logPaged.pageCount}
              total={logPaged.total}
              setPage={logPaged.setPage}
              setPageSize={logPaged.setPageSize}
            />

            <table>
              <thead>
                <tr>
                  <th>S.N</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Request</th>
                  <th>Request Type</th>
                  <th>Details</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {logPaged.pageItems.map((log, index) => (
                  <tr key={log.id}>
                    <td>{logPaged.absoluteIndex(index)}</td>

                    <td>{renderAction(log.action)}</td>

                    <td>
                      {log.user_name || log.user || "System"}
                    </td>

                    <td>{log.request_title || "—"}</td>

                    <td>{log.request_type_name || "—"}</td>

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
