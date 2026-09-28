import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function ApproverDashboard() {
    const role = "APPROVER";
    const isAdmin = false;

    return (
        <div>
            <Navbar />

            <div className="dashboard-content">

                <Sidebar
                    role={role}
                    isAdmin={isAdmin}
                />

                <main>
                    <h1>Approver Dashboard</h1>

                    <p>
                        Welcome to Request Approval System.
                    </p>

                    <p>
                        Here you can review and approve assigned requests.
                    </p>
                </main>

            </div>
        </div>
    );
}

export default ApproverDashboard;