import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiFetch';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      const data = await response.json();
      setMessage(data.message || 'If an account exists, a reset link has been sent.');
    } finally { setLoading(false); }
  }

  return <div className="flex-1 flex items-center justify-center px-4 pb-20"><div className="w-full max-w-sm space-y-5">
    <div><h1 className="font-serif text-2xl font-semibold">Reset your password</h1><p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>We’ll email you a secure reset link.</p></div>
    {message ? <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: 'var(--color-accent-soft)' }}>{message}</div> : <form onSubmit={submit} className="space-y-3">
      <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
      <button disabled={loading} className="w-full py-3.5 rounded-2xl font-semibold text-white bg-stone-900 disabled:opacity-50">{loading ? 'Sending…' : 'Send reset link'}</button>
    </form>}
    <Link to="/login" className="block text-center text-sm text-amber-800">Back to sign in</Link>
  </div></div>;
}
