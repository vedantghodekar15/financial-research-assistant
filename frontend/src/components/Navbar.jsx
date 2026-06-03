import { Link, useNavigate } from "react-router-dom";
import { logoutUser, isAuthenticated } from "../services/authService";
 
function Navbar() {
  const navigate = useNavigate();
 
  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };
 
  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="logo">
        Financial<em>AI</em>
      </div>
 
      {/* Links */}
      <div className="nav-links">
        {isAuthenticated() ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
 
export default Navbar;