import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { UtensilsCrossed } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }
    if (username.length < 3 || username.length > 30 || !/^[a-z0-9._]+$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Use 3-30 letters, numbers, periods, or underscores.');
      return;
    }

    const controller = new AbortController();
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/username-availability?username=${encodeURIComponent(username)}`, { signal: controller.signal });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${data.username} is available`);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(data.error || `@${username} is already taken`);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setUsernameStatus('idle');
          setUsernameMessage('');
        }
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (username.length < 3 || username.length > 30 || !/^[a-z0-9._]+$/.test(username)) {
      setError('Choose a valid username'); return;
    }
    if (usernameStatus === 'taken') { setError('That username is already taken'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(email, password, name, username);
      showToast('Welcome to Savor!');
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Join Savor</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Share your recipes with the world</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>@</span>
              <input type="text" value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@+/, '').toLowerCase())}
                required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="your_username"
                className="w-full pl-8 pr-4 py-3.5 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            {usernameMessage && (
              <p className={`text-xs mt-1 px-1 ${usernameStatus === 'available' ? 'text-emerald-600' : usernameStatus === 'checking' ? 'text-stone-500' : 'text-red-500'}`}>
                {usernameMessage}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          {error && <p className="text-xs text-red-500 px-1">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-stone-900 disabled:opacity-50 transition-opacity mt-2">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-amber-800">Sign in</Link>
        </p>
        <p className="text-center text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
          By creating an account, you agree to our{' '}
          <Link to="/privacy-policy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
