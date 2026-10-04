import { useEffect, useState } from "react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem("access");

      const refreshToken = localStorage.getItem("refresh");

      const storedUsername = localStorage.getItem("username");

      const storedRole = localStorage.getItem("role");

      // No saved session
      if (!accessToken || !refreshToken || !storedUsername || !storedRole) {
        setCheckingSession(false);
        return;
      }

      try {
        // Check existing access token
        const profileResponse = await api.get("/accounts/profile/");

        const user = profileResponse.data;

        const role = user.is_staff ? "ADMIN" : user.role;

        localStorage.setItem("username", user.username);

        localStorage.setItem("role", role);

        setUsername(user.username);
        setUserRole(role);
        setIsAdmin(user.is_staff);
        setLoggedIn(true);
      } catch (error) {
        console.log("Access token expired. Trying refresh token...");

        try {
          // Get a new access token
          const refreshResponse = await api.post("/token/refresh/", {
            refresh: refreshToken,
          });

          const newAccessToken = refreshResponse.data.access;

          localStorage.setItem("access", newAccessToken);

          // Fetch user profile again
          const profileResponse = await api.get("/accounts/profile/");

          const user = profileResponse.data;

          const role = user.is_staff ? "ADMIN" : user.role;

          localStorage.setItem("username", user.username);

          localStorage.setItem("role", role);

          setUsername(user.username);
          setUserRole(role);
          setIsAdmin(user.is_staff);
          setLoggedIn(true);
        } catch (refreshError) {
          console.log("Session expired:", refreshError);

          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("username");
          localStorage.removeItem("role");
        }
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      const message = "Username or password is invalid.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/token/", {
        username: username.trim(),
        password: password,
      });

      localStorage.setItem("access", response.data.access);

      localStorage.setItem("refresh", response.data.refresh);

      const profileResponse = await api.get("/accounts/profile/");

      const user = profileResponse.data;

      console.log("Logged in user:", user);

      const role = user.is_staff ? "ADMIN" : user.role;

      localStorage.setItem("username", user.username);

      localStorage.setItem("role", role);

      setUserRole(role);
      setIsAdmin(user.is_staff);
      setLoggedIn(true);
    } catch (error) {
      console.log("Login failed:", error);

      const message = "Username or password is wrong.";
      setError(message);
      toast.error(message);

      localStorage.removeItem("access");

      localStorage.removeItem("refresh");

      localStorage.removeItem("username");

      localStorage.removeItem("role");
    } finally {
      setLoading(false);
    }
  };

  // Check saved session before showing login page
  if (checkingSession) {
    return (
      <div className="login-page">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">NT</div>

            <h1>Request Approval System</h1>

            <p>Nepal Telecom</p>
          </div>

          <div className="login-heading">
            <h2>Checking Session</h2>

            <span>Please wait...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loggedIn) {
    if (isAdmin) {
      return <AdminDashboard />;
    }

    if (userRole === "VERIFIER") {
      return <VerifierDashboard />;
    }

    if (userRole === "APPROVER") {
      return <ApproverDashboard />;
    }

    if (userRole === "USER") {
      return <UserDashboard role={userRole} isAdmin={isAdmin} />;
    }
  }

  return (
    <div className="login-page">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">NT</div>

          <h1>Request Approval System</h1>

          <p>Nepal Telecom</p>
        </div>

        <div className="login-heading">
          <h2>Welcome Back</h2>

          <span>Sign in to access your account</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <span>Nepal Telecom</span>

          <span>•</span>

          <span>Request Approval System</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
