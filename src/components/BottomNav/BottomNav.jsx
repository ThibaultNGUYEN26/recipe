import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./BottomNav.css";

function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL;

  function isActive(path) {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <nav className="bottom-nav">
      <div className="dock-inner">

        {/* Home */}
        <Link to="/" className={`nav-item ${isActive("/") ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span className="nav-label">Accueil</span>
        </Link>

        {/* Search */}
        <Link to="/search" className={`nav-item ${isActive("/search") ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="nav-label">Recherche</span>
        </Link>

        {/* Add — only when logged in */}
        {user && (
          <>
            <div className="dock-divider" />
            <Link to="/add-recipe" className={`nav-item nav-add ${isActive("/add-recipe") ? "active" : ""}`}>
              <div className="nav-add-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="nav-label">Ajouter</span>
            </Link>
            <div className="dock-divider" />
          </>
        )}

        {/* Profile or Login */}
        <Link
          to={user ? `/profile/${user.id}` : "/login"}
          className={`nav-item ${isActive("/profile") || isActive("/login") || isActive("/settings") ? "active" : ""}`}
        >
          {user ? (
            <div className="nav-avatar">
              {user.avatarUrl
                ? <img src={`${API}${user.avatarUrl}`} alt={user.name} />
                : <span>{(user.name || user.email || "?")[0].toUpperCase()}</span>
              }
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
          <span className="nav-label">{user ? "Profil" : "Connexion"}</span>
        </Link>

      </div>
    </nav>
  );
}

export default BottomNav;
