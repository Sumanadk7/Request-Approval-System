import { useEffect, useState } from "react";

function Navbar() {
  const [username, setUsername] = useState("User");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">NT</div>

        <div>
          <h2>Request Approval System</h2>
          <span>Nepal Telecom</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <strong>{username}</strong>
          <span>Online</span>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
