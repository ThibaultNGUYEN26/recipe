import { Link } from "react-router-dom";
import "./Footer.css";
import { useTheme } from "../../contexts/ThemeContext";

export default function Footer() {
  const { theme } = useTheme();

  return (
    <footer className={`footer${theme === "dark" ? " dark" : ""}`}>
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
