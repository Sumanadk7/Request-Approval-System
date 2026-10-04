import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
    const [view, setView] = useState("login");

    if (view === "register") {
        return <Register onNavigate={setView} />;
    }

    return <Login onNavigate={setView} />;
}

export default App;