import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function VerifierDashboard() {
    const role = "VERIFIER";
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
                    <h1>Verifier Dashboard</h1>

                    <p>
                        Welcome to Request Approval System.
                    </p>

                    <p>
                        Here you can review and verify assigned requests.
                    </p>
                </main>

            </div>
        </div>
    );
}

export default VerifierDashboard;