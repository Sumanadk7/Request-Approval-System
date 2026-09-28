import { useState } from "react";

import api from "../services/api";

import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import VerifierDashboard from "./VerifierDashboard";
import ApproverDashboard from "./ApproverDashboard";

function Login() {
    const [loggedIn, setLoggedIn] = useState(false);

    const [userRole, setUserRole] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        try {
            // Get JWT tokens
            const response = await api.post("/token/", {
                username: username,
                password: password,
            });

            // Store JWT tokens
            localStorage.setItem(
                "access",
                response.data.access
            );

            localStorage.setItem(
                "refresh",
                response.data.refresh
            );

            // Get user profile
            const profileResponse = await api.get(
                "/accounts/profile/"
            );

            const user = profileResponse.data;

            console.log("Logged in user:", user);

            // Store role information
            setUserRole(user.role);
            setIsAdmin(user.is_staff);

            alert(
                `Login successful! Role: ${user.role}`
            );

            setLoggedIn(true);

        } catch (error) {
            console.log(error);

            setError("Invalid username or password.");
        }
    };

    // =========================
    // DASHBOARD ROUTING
    // =========================

    if (loggedIn) {

        // Admin
        if (isAdmin) {
            return <AdminDashboard />;
        }

        // Verifier
        if (userRole === "VERIFIER") {
            return <VerifierDashboard />;
        }

        // Approver
        if (userRole === "APPROVER") {
            return <ApproverDashboard />;
        }

        // Normal User
        if (userRole === "USER") {
            return (
                <UserDashboard
                    role={userRole}
                    isAdmin={isAdmin}
                />
            );
        }
    }

    // =========================
    // LOGIN PAGE
    // =========================

    return (
        <div>

            <h1>Request Approval System</h1>

            <h2>Login</h2>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Username</label>
                    <br />

                    <input
                        type="text"
                        value={username}
                        onChange={(e) =>
                            setUsername(e.target.value)
                        }
                        placeholder="Enter username"
                    />
                </div>

                <br />

                <div>
                    <label>Password</label>
                    <br />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        placeholder="Enter password"
                    />
                </div>

                <br />

                <button type="submit">
                    Login
                </button>

            </form>

            {error && (
                <p>{error}</p>
            )}

        </div>
    );
}

export default Login;