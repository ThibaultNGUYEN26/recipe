import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Auth.css";

function getStrength(pwd) {
  if (!pwd) return { level: 0, label: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["", "Faible", "Moyen", "Bon", "Fort"];
  return { level: score, label: labels[score] };
}

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
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
          <h1>Créer un compte</h1>
          <p>Rejoignez la communauté</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="name">Prénom (optionnel)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre prénom"
            />
          </div>

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
                placeholder="Minimum 6 caractères"
                required
                minLength={6}
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
            {password && (() => {
              const { level, label } = getStrength(password);
              return (
                <div className="auth-strength">
                  <div className="auth-strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`auth-strength-segment ${i <= level ? "filled" : ""}`}
                        data-level={i <= level ? level : undefined}
                      />
                    ))}
                  </div>
                  <span className="auth-strength-label" data-level={level}>{label}</span>
                </div>
              );
            })()}
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirmer le mot de passe</label>
            <div className="auth-input-wrapper">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Masquer" : "Afficher"}
              >
                {showConfirm ? "🙈" : "🙉"}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className="auth-switch">
          Déjà un compte ?{" "}
          <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
