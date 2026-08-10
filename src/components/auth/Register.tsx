import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { UtensilsCrossed, Eye, EyeOff } from 'lucide-react';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-400' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
  return { score, label: 'Very strong', color: 'bg-emerald-600' };
}

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getPasswordStrength(password);

  const inputCls = 'w-full px-4 py-2.5 rounded-2xl text-sm outline-none';
  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };

  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      setUsernameSuggestions([]);
      return;
    }
    if (username.length < 3 || username.length > 30 || !/^[a-z0-9._]+$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Use 3-30 letters, numbers, periods, or underscores.');
      setUsernameSuggestions([]);
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
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(data.error || `@${username} is already taken`);
          setUsernameSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setUsernameStatus('idle');
          setUsernameMessage('');
          setUsernameSuggestions([]);
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
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
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
    <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden pb-20">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-800 flex items-center justify-center mb-2">
            <UtensilsCrossed size={22} className="text-white" />
          </div>
          <h1 className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Join Savor</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Share your recipes with the world</p>
        </div>

        <form onSubmit={submit} className="space-y-2.5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              className={inputCls} style={inputStyle} />
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>@</span>
              <input type="text" value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@+/, '').toLowerCase())}
                required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="your_username"
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl text-sm outline-none"
                style={inputStyle} />
            </div>
            {usernameMessage && (
              <p className={`text-xs mt-1 px-1 ${usernameStatus === 'available' ? 'text-emerald-600' : usernameStatus === 'checking' ? 'text-stone-500' : 'text-red-500'}`}>
                {usernameMessage}
              </p>
            )}
            {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
                <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Try:</span>
                {usernameSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setUsername(s)}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors">
                    @{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className={inputCls} style={inputStyle} />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters"
                className="w-full px-4 pr-11 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
                style={{ color: 'var(--color-muted)' }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-1.5 px-0.5">
                <div className="flex gap-1 mb-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-stone-200'}`} />
                  ))}
                </div>
                <p className={`text-[11px] font-medium ${
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score <= 2 ? 'text-orange-500' :
                  strength.score <= 3 ? 'text-yellow-600' :
                  'text-emerald-600'
                }`}>{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Confirm password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repeat your password"
                className="w-full px-4 pr-11 py-2.5 rounded-2xl text-sm outline-none"
                style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : 'var(--color-border)' }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
                style={{ color: 'var(--color-muted)' }}>
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs mt-1 px-1 text-red-500">Passwords do not match</p>
            )}
          </div>

          {error && <p className="text-xs text-red-500 px-1">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-2xl font-semibold text-white bg-stone-900 disabled:opacity-50 transition-opacity mt-1">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-amber-800">Sign in</Link>
        </p>
        <p className="text-center text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
          By creating an account, you agree to our{' '}
          <Link to="/privacy-policy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
