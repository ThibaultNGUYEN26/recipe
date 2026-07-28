import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Auth.css";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🍽️</div>
          <h1>Bon retour !</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? "🙈" : "🙉"}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ?{" "}
          <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
