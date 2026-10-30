import { useEffect, useRef, useState } from "react";
import api from "../services/api";

function Workflows() {
    const [workflows, setWorkflows] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [assignmentsByWorkflow, setAssignmentsByWorkflow] =
        useState({});

    const [selectedRequestType, setSelectedRequestType] = useState("");
    const [verifierMode, setVerifierMode] = useState("SEQUENTIAL");
    const [approverMode, setApproverMode] = useState("SEQUENTIAL");

    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [selectedUser, setSelectedUser] = useState("");
    const [assignmentRole, setAssignmentRole] = useState("VERIFIER");
    const [assignmentOrder, setAssignmentOrder] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const detailRef = useRef(null);

    const fetchAssignmentsFor = async (workflowId) => {
        try {
            const response = await api.get(
                `/workflows/${workflowId}/assignments/`
            );

            return response.data;
        } catch (error) {
            console.log(
                "Failed to load workflow assignments:",
                error
            );

            return [];
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                workflowResponse,
                requestTypeResponse,
                userResponse,
            ] = await Promise.all([
                api.get("/workflows/"),
                api.get("/request-types/"),
                api.get("/accounts/admin-users/"),
            ]);

            const workflowList = workflowResponse.data;

            setWorkflows(workflowList);
            setRequestTypes(requestTypeResponse.data);
            setUsers(userResponse.data);

            const assignmentEntries = await Promise.all(
                workflowList.map(async (workflow) => [
                    workflow.id,
                    await fetchAssignmentsFor(workflow.id),
                ])
            );

            setAssignmentsByWorkflow(
                Object.fromEntries(assignmentEntries)
            );
        } catch (error) {
            console.log("Failed to load workflow data:", error);
            setError("Failed to load workflow data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openWorkflow = async (workflow, shouldScroll = true) => {
        setSelectedWorkflow(workflow);
        setDetailLoading(true);

        try {
            const [detailResponse, assignmentResponse] =
                await Promise.all([
                    api.get(`/workflows/${workflow.id}/`),
                    api.get(
                        `/workflows/${workflow.id}/assignments/`
                    ),
                ]);

            setSelectedWorkflow(detailResponse.data);

            setAssignmentsByWorkflow((previous) => ({
                ...previous,
                [workflow.id]: assignmentResponse.data,
            }));
        } catch (error) {
            console.log("Failed to load workflow details:", error);
            setError("Failed to load workflow details.");
        } finally {
            setDetailLoading(false);
        }

        if (shouldScroll) {
            setTimeout(() => {
                detailRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 80);
        }
    };

    const refreshSelectedWorkflow = async () => {
        if (!selectedWorkflow) {
            return;
        }

        await openWorkflow(selectedWorkflow, false);
        await fetchData();
    };

    const handleCreateWorkflow = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!selectedRequestType) {
            setError("Please select a request type.");
            return;
        }

        try {
            setSaving(true);

            const response = await api.post("/workflows/", {
                request_type: selectedRequestType,
                verifier_mode: verifierMode,
                approver_mode: approverMode,
            });

            setMessage("Workflow created successfully.");

            setSelectedRequestType("");
            setVerifierMode("SEQUENTIAL");
            setApproverMode("SEQUENTIAL");

            await fetchData();
            await openWorkflow(response.data);
        } catch (error) {
            console.log("Failed to create workflow:", error);

            const detail =
                error.response?.data?.detail ||
                "Failed to create workflow.";

            setError(detail);
        } finally {
            setSaving(false);
        }
    };

    const handleAddAssignment = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!selectedWorkflow) {
            setError("Please select a workflow first.");
            return;
        }

        if (!selectedUser) {
            setError("Please select a user.");
            return;
        }

        try {
            setSaving(true);

            await api.post(
                `/workflows/${selectedWorkflow.id}/assignments/`,
                {
                    user: selectedUser,
                    role: assignmentRole,
                    order: Number(assignmentOrder),
                }
            );

            setMessage("Workflow assignment added successfully.");

            setSelectedUser("");
            setAssignmentRole("VERIFIER");
            setAssignmentOrder(1);

            await refreshSelectedWorkflow();
        } catch (error) {
            console.log(
                "Failed to add workflow assignment:",
                error
            );

            const detail =
                error.response?.data?.detail ||
                "Failed to add workflow assignment.";

            setError(detail);
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async (workflow) => {
        try {
            setMessage("");
            setError("");

            await api.patch(
                `/workflows/${workflow.id}/`,
                {
                    is_active: true,
                }
            );

            setMessage("Workflow activated.");
            await fetchData();

            if (selectedWorkflow?.id === workflow.id) {
                await openWorkflow(
                    { ...selectedWorkflow, is_active: true },
                    false
                );
            }
        } catch (error) {
            console.log("Failed to activate workflow:", error);
            setError("Failed to activate workflow.");
        }
    };

    const handleDeactivate = async (workflow) => {
        try {
            setMessage("");
            setError("");

            await api.patch(
                `/workflows/${workflow.id}/`,
                {
                    is_active: false,
                }
            );

            setMessage("Workflow deactivated.");
            await fetchData();

            if (selectedWorkflow?.id === workflow.id) {
                await openWorkflow(
                    { ...selectedWorkflow, is_active: false },
                    false
                );
            }
        } catch (error) {
            console.log(
                "Failed to deactivate workflow:",
                error
            );

            setError("Failed to deactivate workflow.");
        }
    };

    const getUserName = (userId) => {
        const user = users.find(
            (item) => item.id === userId
        );

        return user ? user.username : `User #${userId}`;
    };

    const getAssignmentUserName = (assignment) => {
        return (
            assignment.user_username ||
            getUserName(assignment.user)
        );
    };

    const getRequestTypeName = (workflow) => {
        if (!workflow) {
            return "";
        }

        const requestType = requestTypes.find(
            (item) => item.id === workflow.request_type
        );

        return requestType
            ? requestType.name
            : `Request Type #${workflow.request_type}`;
    };

    const getAssignments = (workflow) => {
        if (!workflow) {
            return [];
        }

        return assignmentsByWorkflow[workflow.id] || [];
    };

    const getActiveAssignments = (workflow) => {
        return getAssignments(workflow).filter(
            (assignment) => assignment.is_active
        );
    };

    const getChain = (workflow, role) => {
        return getActiveAssignments(workflow)
            .filter((assignment) => assignment.role === role)
            .sort((a, b) => {
                if (a.order !== b.order) {
                    return a.order - b.order;
                }

                return new Date(a.created_at) - new Date(b.created_at);
            });
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleString();
    };

    const buildHistory = (workflow) => {
        if (!workflow) {
            return [];
        }

        const history = [];

        history.push({
            key: `created-${workflow.id}`,
            type: "created",
            event: "Workflow Created",
            detail:
                `${getRequestTypeName(workflow)} — ` +
                `Verifier mode: ${workflow.verifier_mode}, ` +
                `Approver mode: ${workflow.approver_mode}`,
            at: workflow.created_at,
        });

        getAssignments(workflow).forEach((assignment) => {
            history.push({
                key: `assignment-${assignment.id}`,
                type: assignment.is_active
                    ? "added"
                    : "removed",
                event: assignment.is_active
                    ? "Assignment Added"
                    : "Assignment Inactive",
                detail:
                    `${getAssignmentUserName(assignment)} — ` +
                    `${assignment.role} (Order ${assignment.order})`,
                at: assignment.created_at,
            });
        });

        const createdAt = new Date(workflow.created_at).getTime();
        const updatedAt = new Date(workflow.updated_at).getTime();

        if (updatedAt - createdAt > 1000) {
            history.push({
                key: `status-${workflow.id}`,
                type: workflow.is_active
                    ? "added"
                    : "removed",
                event: workflow.is_active
                    ? "Workflow Activated"
                    : "Workflow Deactivated",
                detail: "Workflow status was updated.",
                at: workflow.updated_at,
            });
        }

        return history.sort(
            (a, b) => new Date(b.at) - new Date(a.at)
        );
    };

    const renderChain = (workflow, role) => {
        const chain = getChain(workflow, role);

        if (chain.length === 0) {
            return (
                <span className="workflow-chip empty">
                    No {role.toLowerCase()} assigned
                </span>
            );
        }

        return chain.map((assignment) => (
            <span
                key={assignment.id}
                className={`workflow-chip ${role.toLowerCase()}`}
            >
                <span className="chip-order">
                    {assignment.order}
                </span>

                {getAssignmentUserName(assignment)}
            </span>
        ));
    };

    return (
        <>
            <div className="page-title">
                <h1>Workflows</h1>
                <p>
                    Configure request approval workflows,
                    verification and approval assignments.
                </p>
            </div>

            {message && (
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
                    {message}
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
                <div className="section-header">
                    <h2>Create Workflow</h2>
                </div>

                <form onSubmit={handleCreateWorkflow}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Request Type</label>

                            <select
                                value={selectedRequestType}
                                onChange={(e) =>
                                    setSelectedRequestType(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select Request Type
                                </option>

                                {requestTypes.map((type) => (
                                    <option
                                        key={type.id}
                                        value={type.id}
                                    >
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                Verifier Mode
                            </label>

                            <select
                                value={verifierMode}
                                onChange={(e) =>
                                    setVerifierMode(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="SEQUENTIAL">
                                    Sequential
                                </option>

                                <option value="PARALLEL">
                                    Parallel
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                Approver Mode
                            </label>

                            <select
                                value={approverMode}
                                onChange={(e) =>
                                    setApproverMode(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="SEQUENTIAL">
                                    Sequential
                                </option>

                                <option value="PARALLEL">
                                    Parallel
                                </option>
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
                                ? "Creating..."
                                : "Create Workflow"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2>Workflow List</h2>
                </div>

                {loading ? (
                    <p>Loading workflows...</p>
                ) : workflows.length === 0 ? (
                    <p>No workflows found.</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Request Type</th>
                                    <th>Verifiers</th>
                                    <th>Approvers</th>
                                    <th>Modes</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {workflows.map((workflow) => (
                                    <tr key={workflow.id}>
                                        <td>
                                            #{workflow.id}
                                        </td>

                                        <td>
                                            {getRequestTypeName(
                                                workflow
                                            )}
                                        </td>

                                        <td>
                                            <div className="workflow-chain">
                                                {renderChain(
                                                    workflow,
                                                    "VERIFIER"
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="workflow-chain">
                                                {renderChain(
                                                    workflow,
                                                    "APPROVER"
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="workflow-modes">
                                                <span>
                                                    V:{" "}
                                                    {
                                                        workflow.verifier_mode
                                                    }
                                                </span>

                                                <span>
                                                    A:{" "}
                                                    {
                                                        workflow.approver_mode
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`status ${
                                                    workflow.is_active
                                                        ? "approved"
                                                        : "rejected"
                                                }`}
                                            >
                                                {workflow.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className="btn btn-info"
                                                onClick={() =>
                                                    openWorkflow(
                                                        workflow
                                                    )
                                                }
                                            >
                                                View / Manage
                                            </button>

                                            {workflow.is_active ? (
                                                <button
                                                    className="btn btn-danger"
                                                    style={{
                                                        marginLeft:
                                                            "8px",
                                                    }}
                                                    onClick={() =>
                                                        handleDeactivate(
                                                            workflow
                                                        )
                                                    }
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-success"
                                                    style={{
                                                        marginLeft:
                                                            "8px",
                                                    }}
                                                    onClick={() =>
                                                        handleActivate(
                                                            workflow
                                                        )
                                                    }
                                                >
                                                    Activate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedWorkflow && (
                <div className="section workflow-detail" ref={detailRef}>
                    <div className="section-header">
                        <h2>
                            Workflow Details #
                            {selectedWorkflow.id}{" "}
                            <span
                                className={`status ${
                                    selectedWorkflow.is_active
                                        ? "approved"
                                        : "rejected"
                                }`}
                            >
                                {selectedWorkflow.is_active
                                    ? "Active"
                                    : "Inactive"}
                            </span>
                        </h2>

                        <button
                            className="btn btn-clear"
                            onClick={() =>
                                setSelectedWorkflow(null)
                            }
                        >
                            Close
                        </button>
                    </div>

                    {detailLoading ? (
                        <p>Loading workflow details...</p>
                    ) : (
                        <>
                            <div className="workflow-info-grid">
                                <div className="workflow-info-item">
                                    <span>Request Type</span>

                                    <strong>
                                        {getRequestTypeName(
                                            selectedWorkflow
                                        )}
                                    </strong>
                                </div>

                                <div className="workflow-info-item">
                                    <span>Verifier Mode</span>

                                    <strong>
                                        {
                                            selectedWorkflow.verifier_mode
                                        }
                                    </strong>
                                </div>

                                <div className="workflow-info-item">
                                    <span>Approver Mode</span>

                                    <strong>
                                        {
                                            selectedWorkflow.approver_mode
                                        }
                                    </strong>
                                </div>

                                <div className="workflow-info-item">
                                    <span>Created At</span>

                                    <strong>
                                        {formatDate(
                                            selectedWorkflow.created_at
                                        )}
                                    </strong>
                                </div>

                                <div className="workflow-info-item">
                                    <span>Last Updated</span>

                                    <strong>
                                        {formatDate(
                                            selectedWorkflow.updated_at
                                        )}
                                    </strong>
                                </div>

                                <div className="workflow-info-item">
                                    <span>Status</span>

                                    <strong>
                                        {selectedWorkflow.is_active
                                            ? "Active"
                                            : "Inactive"}
                                    </strong>
                                </div>
                            </div>

                            <div className="workflow-assigned">
                                <div>
                                    <h3>Assigned Verifiers</h3>

                                    <div className="workflow-chain">
                                        {renderChain(
                                            selectedWorkflow,
                                            "VERIFIER"
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3>Assigned Approvers</h3>

                                    <div className="workflow-chain">
                                        {renderChain(
                                            selectedWorkflow,
                                            "APPROVER"
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: "24px",
                                    marginBottom: "20px",
                                }}
                            >
                                <h3>
                                    Add Verifier / Approver
                                </h3>

                                <form
                                    onSubmit={handleAddAssignment}
                                >
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Role</label>

                                            <select
                                                value={assignmentRole}
                                                onChange={(e) =>
                                                    setAssignmentRole(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="VERIFIER">
                                                    Verifier
                                                </option>

                                                <option value="APPROVER">
                                                    Approver
                                                </option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>User</label>

                                            <select
                                                value={selectedUser}
                                                onChange={(e) =>
                                                    setSelectedUser(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select User
                                                </option>

                                                {users
                                                    .filter(
                                                        (user) =>
                                                            user.role ===
                                                                assignmentRole
                                                    )
                                                    .map((user) => (
                                                        <option
                                                            key={
                                                                user.id
                                                            }
                                                            value={
                                                                user.id
                                                            }
                                                        >
                                                            {
                                                                user.username
                                                            }
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                Order
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                value={
                                                    assignmentOrder
                                                }
                                                onChange={(e) =>
                                                    setAssignmentOrder(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={saving}
                                        >
                                            {saving
                                                ? "Adding..."
                                                : "Add Assignment"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div>
                                <h3>
                                    Current Assignments
                                </h3>

                                {getActiveAssignments(
                                    selectedWorkflow
                                ).length === 0 ? (
                                    <p>
                                        No active assignments
                                        found.
                                    </p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>
                                                        User
                                                    </th>
                                                    <th>
                                                        Role
                                                    </th>
                                                    <th>
                                                        Order
                                                    </th>
                                                    <th>
                                                        Status
                                                    </th>
                                                    <th>
                                                        Assigned At
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {getActiveAssignments(
                                                    selectedWorkflow
                                                )
                                                    .sort(
                                                        (
                                                            a,
                                                            b
                                                        ) =>
                                                            a.role ===
                                                            b.role
                                                                ? a.order -
                                                                  b.order
                                                                : a.role.localeCompare(
                                                                      b.role
                                                                  )
                                                    )
                                                    .map(
                                                        (
                                                            assignment
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    assignment.id
                                                                }
                                                            >
                                                                <td>
                                                                    {getAssignmentUserName(
                                                                        assignment
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    <span
                                                                        className={`workflow-chip ${assignment.role.toLowerCase()}`}
                                                                    >
                                                                        {
                                                                            assignment.role
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    {
                                                                        assignment.order
                                                                    }
                                                                </td>

                                                                <td>
                                                                    <span className="status approved">
                                                                        Active
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    {formatDate(
                                                                        assignment.created_at
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: "26px" }}>
                                <h3>Workflow History</h3>

                                {buildHistory(selectedWorkflow)
                                    .length === 0 ? (
                                    <p>No history available.</p>
                                ) : (
                                    <ul className="history-list">
                                        {buildHistory(
                                            selectedWorkflow
                                        ).map((item) => (
                                            <li
                                                key={item.key}
                                                className={`history-item history-${item.type}`}
                                            >
                                                <span className="history-dot" />

                                                <div className="history-body">
                                                    <strong>
                                                        {item.event}
                                                    </strong>

                                                    <p>
                                                        {item.detail}
                                                    </p>
                                                </div>

                                                <span className="history-time">
                                                    {formatDate(
                                                        item.at
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

export default Workflows;
