function Sidebar({ role, isAdmin }) {
    return (
        <aside>

            <h3>Menu</h3>

            {/* ADMIN MENU */}
            {isAdmin && (
                <ul>
                    <li>Dashboard</li>
                    <li>Users</li>
                    <li>Departments</li>
                    <li>Request Types</li>
                    <li>Workflows</li>
                    <li>Requests</li>
                    <li>Audit Logs</li>
                    <li>Notifications</li>
                </ul>
            )}

            {/* USER MENU */}
            {!isAdmin && role === "USER" && (
                <ul>
                    <li>Dashboard</li>
                    <li>My Requests</li>
                    <li>Create Request</li>
                    <li>Notifications</li>
                </ul>
            )}

            {/* VERIFIER MENU */}
            {!isAdmin && role === "VERIFIER" && (
                <ul>
                    <li>Dashboard</li>
                    <li>Pending Requests</li>
                    <li>Notifications</li>
                </ul>
            )}

            {/* APPROVER MENU */}
            {!isAdmin && role === "APPROVER" && (
                <ul>
                    <li>Dashboard</li>
                    <li>Pending Approvals</li>
                    <li>Notifications</li>
                </ul>
            )}

        </aside>
    );
}

export default Sidebar;