import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-title">Carnet de Recettes</p>

        <nav className="footer-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
        </nav>

        <p className="footer-copy">
          © {new Date().getFullYear()} Carnet de Recettes
        </p>
      </div>
    </footer>
  );
}
