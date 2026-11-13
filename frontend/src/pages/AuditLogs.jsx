import { useEffect, useState } from "react";
import api from "../services/api";
import Pagination, {
  usePagedList,
} from "../components/Pagination";

const ACTION_TONES = {
  CREATED: "created",
  UPDATED: "updated",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  APPROVED: "approved",
  REASSIGNED: "reassigned",
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function ActionIcon({ action }) {
  switch (action) {
    case "CREATED":
      return (
        <svg {...iconProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "UPDATED":
      return (
        <svg {...iconProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "SUBMITTED":
      return (
        <svg {...iconProps}>
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      );
    case "VERIFIED":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      );
    case "APPROVED":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "REJECTED":
      return (
        <svg {...iconProps}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case "REASSIGNED":
      return (
        <svg {...iconProps}>
          <path d="M7 7h11" />
          <path d="m14 4 3 3-3 3" />
          <path d="M17 17H6" />
          <path d="m10 14-3 3 3 3" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

function StatIcon({ name }) {
  switch (name) {
    case "today":
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "latest":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      );
  }
}

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
  const actions = [
    ...new Set(logs.map((log) => log.action).filter(Boolean)),
  ].sort();
  const hasFilters =
    search.trim() !== "" ||
    actionFilter !== "ALL" ||
    rangeFilter !== "ALL";

  const filteredLogs = logs.filter((log) => {
    const query = search.trim().toLowerCase();    const searchable = [
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
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
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

    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <>
      <div className="page-title audit-page-title">
        <div>
          <h1>Audit Logs</h1>
          <p>Track every action across requests, workflows and users.</p>
        </div>

        <span className="audit-live-pill">
          <span className="audit-live-dot" />
          Activity feed
        </span>
      </div>

      <div className="audit-stats">
        <div className="audit-stat-card">
          <span className="audit-stat-icon blue">
            <StatIcon name="activity" />
          </span>
          <div>
            <p>Total activity</p>
            <h3>{loading ? "..." : logs.length}</h3>
          </div>
        </div>

        <div className="audit-stat-card">
          <span className="audit-stat-icon green">
            <StatIcon name="today" />
          </span>
          <div>
            <p>Today's events</p>
            <h3>{loading ? "..." : todayCount}</h3>
          </div>
        </div>

        <div className="audit-stat-card">
          <span className="audit-stat-icon gold">
            <StatIcon name="users" />
          </span>
          <div>
            <p>Active users</p>
            <h3>{loading ? "..." : activeUsers}</h3>
          </div>
        </div>

        <div className="audit-stat-card">
          <span className="audit-stat-icon purple">
            <StatIcon name="latest" />
          </span>
          <div>
            <p>Latest activity</p>
            <h3 className="audit-stat-time">
              {loading
                ? "..."
                : latestLog
                  ? formatRelative(latestLog.created_at)
                  : "No activity"}
            </h3>
          </div>
        </div>
      </div>

      <div className="section audit-section">
        <div className="audit-toolbar">
          <div className="audit-search">
            <svg {...iconProps}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, user, request or message..."
              aria-label="Search audit logs"
            />
          </div>

          <div className="audit-filters">
            <select
              className="audit-select"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              aria-label="Filter by action"
            >
              <option value="ALL">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <select
              className="audit-select"
              value={rangeFilter}
              onChange={(event) => setRangeFilter(event.target.value)}
              aria-label="Filter by date range"
            >
              <option value="ALL">All time</option>
              <option value="TODAY">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                className="btn btn-clear audit-reset"
                onClick={resetFilters}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {!loading && !error && logs.length > 0 && (
          <div className="audit-results-bar">
            <span>
              <strong>{filteredLogs.length}</strong>{" "}
              {filteredLogs.length === 1 ? "event" : "events"}
              {hasFilters ? ` of ${logs.length}` : ""}
            </span>
            <span>Newest first</span>
          </div>
        )}

        {loading && (
          <div className="audit-loading">
            <span className="audit-spinner" />
            <p>Loading audit trail...</p>
          </div>
        )}

        {!loading && error && (
          <div className="audit-error">{error}</div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div className="audit-empty">
            <svg {...iconProps} width="34" height="34">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <h3>
              {logs.length === 0
                ? "No activity yet"
                : "No matching activity"}
            </h3>
            <p>
              {logs.length === 0
                ? "Actions across requests and workflows will appear here."
                : "Try a different search term, action or date range."}
            </p>
            {hasFilters && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <div className="audit-feed">
            <Pagination
              page={logPaged.page}
              pageCount={logPaged.pageCount}
              total={logPaged.total}
              setPage={logPaged.setPage}
              setPageSize={logPaged.setPageSize}
            />

            {logPaged.pageItems.map((log) => {
              const tone = ACTION_TONES[log.action] || "default";
              const userName =
                log.user_name || String(log.user || "System");

              return (
                <article className="audit-item" key={log.id}>
                  <span className={`audit-marker tone-${tone}`}>
                    <ActionIcon action={log.action} />
                  </span>

                  <div className="audit-card">
                    <div className="audit-card-head">
                      <div className="audit-card-tags">
                        <span className={`audit-action-pill tone-${tone}`}>
                          {log.action}
                        </span>

                        {log.request_title ? (
                          <span
                            className="audit-request-chip"
                            title={log.request_title}
                          >
                            {log.request_title}
                          </span>
                        ) : (
                          <span className="audit-request-chip muted">
                            System event
                          </span>
                        )}
                      </div>

                      <time
                        className="audit-time"
                        dateTime={log.created_at}
                        title={formatDate(log.created_at)}
                      >
                        <strong>{formatRelative(log.created_at)}</strong>
                        <span>{formatDate(log.created_at)}</span>
                      </time>
                    </div>

                    <p className="audit-message">{log.message}</p>

                    <div className="audit-card-meta">
                      <span className="audit-user">
                        <span className="audit-avatar">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                        {userName}
                      </span>

                      {log.request_type_name && (
                        <span className="audit-context">
                          {log.request_type_name}
                        </span>
                      )}

                      {log.request_status && (
                        <span
                          className={`status ${log.request_status.toLowerCase()}`}
                        >
                          {log.request_status}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default AuditLogs;
