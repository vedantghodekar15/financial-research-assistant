import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

import Login       from "./pages/Login";
import Signup      from "./pages/Signup";
import Dashboard   from "./pages/Dashboard";



function App() {
  const location = useLocation();

  // Dashboard manages its own full-height layout — no outer padding needed.
  const isDashboard = location.pathname === "/dashboard";

  return (
    <div className="app-container">
      <Navbar />

      {/* The page-container class adds padding for auth / standalone pages.
          For the dashboard workspace we skip it entirely so the sidebar
          and main area can fill the full viewport height correctly.      */}
      {isDashboard ? (
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      ) : (
        <div className="page-container">
          <Routes>
            <Route path="/"         element={<Login />} />
            <Route path="/signup"   element={<Signup />} />


            {/* Fallback — redirect unknown paths to login */}
            <Route path="*" element={<Login />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

export default App;