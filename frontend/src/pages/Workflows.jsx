import { useEffect, useState } from "react";
import api from "../services/api";

function Workflows() {
    const [workflows, setWorkflows] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedRequestType, setSelectedRequestType] = useState("");
    const [verifierMode, setVerifierMode] = useState("SEQUENTIAL");
    const [approverMode, setApproverMode] = useState("SEQUENTIAL");

    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [selectedUser, setSelectedUser] = useState("");
    const [assignmentRole, setAssignmentRole] = useState("VERIFIER");
    const [assignmentOrder, setAssignmentOrder] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                workflowResponse,
                requestTypeResponse,
                userResponse,
            ] = await Promise.all([
                api.get("/workflow/"),
                api.get("/request-types/"),
                api.get("/accounts/admin-users/"),
            ]);

            setWorkflows(workflowResponse.data);
            setRequestTypes(requestTypeResponse.data);
            setUsers(userResponse.data);
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

            await api.post("/workflow/", {
                request_type: selectedRequestType,
                verifier_mode: verifierMode,
                approver_mode: approverMode,
            });

            setMessage("Workflow created successfully.");

            setSelectedRequestType("");
            setVerifierMode("SEQUENTIAL");
            setApproverMode("SEQUENTIAL");

            await fetchData();
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
                `/workflow/${selectedWorkflow.id}/assignments/`,
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

            await fetchData();

            const updatedWorkflow = (
                await api.get(
                    `/workflow/${selectedWorkflow.id}/`
                )
            ).data;

            setSelectedWorkflow(updatedWorkflow);
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
                `/workflow/${workflow.id}/`,
                {
                    is_active: true,
                }
            );

            setMessage("Workflow activated.");
            await fetchData();
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
                `/workflow/${workflow.id}/`,
                {
                    is_active: false,
                }
            );

            setMessage("Workflow deactivated.");
            await fetchData();
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

        return user
            ? `${user.username} (${user.role})`
            : userId;
    };

    const getAssignments = (workflow) => {
        if (!workflow) {
            return [];
        }

        return (
            workflow.assignments ||
            workflow.assignment_list ||
            []
        );
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
                                    <th>Verifier Mode</th>
                                    <th>Approver Mode</th>
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
                                            {workflow.request_type_name ||
                                                workflow.request_type}
                                        </td>

                                        <td>
                                            {workflow.verifier_mode}
                                        </td>

                                        <td>
                                            {workflow.approver_mode}
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
                                                    setSelectedWorkflow(
                                                        workflow
                                                    )
                                                }
                                            >
                                                Manage
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
                <div className="section">
                    <div className="section-header">
                        <h2>
                            Manage Workflow #
                            {selectedWorkflow.id}
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

                    <p>
                        <strong>Request Type:</strong>{" "}
                        {selectedWorkflow.request_type_name ||
                            selectedWorkflow.request_type}
                    </p>

                    <p>
                        <strong>Verifier Mode:</strong>{" "}
                        {selectedWorkflow.verifier_mode}
                    </p>

                    <p>
                        <strong>Approver Mode:</strong>{" "}
                        {selectedWorkflow.approver_mode}
                    </p>

                    <div
                        style={{
                            marginTop: "20px",
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

                        {getAssignments(
                            selectedWorkflow
                        ).length === 0 ? (
                            <p>
                                No assignments found.
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
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {getAssignments(
                                            selectedWorkflow
                                        )
                                            .sort(
                                                (
                                                    a,
                                                    b
                                                ) =>
                                                    a.order -
                                                    b.order
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
                                                            {assignment.user_username ||
                                                                getUserName(
                                                                    assignment.user
                                                                )}
                                                        </td>

                                                        <td>
                                                            {
                                                                assignment.role
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                assignment.order
                                                            }
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`status ${
                                                                    assignment.is_active
                                                                        ? "approved"
                                                                        : "rejected"
                                                                }`}
                                                            >
                                                                {assignment.is_active
                                                                    ? "Active"
                                                                    : "Inactive"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default Workflows;