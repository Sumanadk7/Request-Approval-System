function Navbar() {
    return (
        <nav className="navbar">

            <div className="navbar-brand">
                <div className="brand-logo">
                    NT
                </div>

                <div>
                    <h2>Request Approval System</h2>
                    <span>Nepal Telecom</span>
                </div>
            </div>

            <div className="navbar-user">

                <div className="user-info">
                    <strong>User</strong>
                    <span>Online</span>
                </div>

                <button>
                    Logout
                </button>

            </div>

        </nav>
    );
}

export default Navbar;