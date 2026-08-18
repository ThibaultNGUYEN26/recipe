import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/apiFetch';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    const response = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: params.get('token'), password }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Could not reset password');
    setDone(true);
  }

  return <div className="flex-1 flex items-center justify-center px-4 pb-20"><div className="w-full max-w-sm space-y-5">
    <h1 className="font-serif text-2xl font-semibold">Choose a new password</h1>
    {done ? <><p className="text-sm">Your password has been changed and previous sessions have been signed out.</p><Link to="/login" className="block text-center py-3 rounded-2xl bg-stone-900 text-white font-semibold">Sign in</Link></> : <form onSubmit={submit} className="space-y-3">
      <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
      <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button className="w-full py-3.5 rounded-2xl font-semibold text-white bg-stone-900">Reset password</button>
    </form>}
  </div></div>;
}
