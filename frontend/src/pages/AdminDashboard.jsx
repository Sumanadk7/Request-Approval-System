import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function AdminDashboard() {
    const role = "USER";
    const isAdmin = true;

    return (
        <div>
            <Navbar />

            <div className="dashboard-content">

                <Sidebar
                    role={role}
                    isAdmin={isAdmin}
                />

                <main>
                    <h1>Admin Dashboard</h1>

                    <p>
                        Welcome to Request Approval System Admin Panel.
                    </p>

                    <p>
                        Here you can manage users, departments,
                        request types, workflows, requests, and audit logs.
                    </p>
                </main>

            </div>
        </div>
    );
}

export default AdminDashboard;