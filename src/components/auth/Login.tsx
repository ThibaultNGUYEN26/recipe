import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { UtensilsCrossed } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-800 flex items-center justify-center mb-3">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Sign in to your account</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          {error && <p className="text-xs text-red-500 px-1">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-stone-900 disabled:opacity-50 transition-opacity mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-amber-800">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
