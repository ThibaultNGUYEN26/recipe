import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/apiFetch';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'verified' | 'error'>('idle');
  const [message, setMessage] = useState('Check your inbox and follow the verification link.');
  const token = params.get('token');

  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    apiFetch('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Verification failed');
        setStatus('verified'); setMessage('Your email has been verified.'); refreshUser();
      })
      .catch((error) => { setStatus('error'); setMessage(error.message); });
  }, [token, refreshUser]);

  async function resend() {
    setStatus('loading');
    const response = await apiFetch('/api/auth/send-verification', { method: 'POST' });
    const data = await response.json();
    setStatus(response.ok ? 'idle' : 'error');
    setMessage(response.ok ? 'A new verification email has been sent.' : data.error || 'Could not send email');
  }

  return <div className="flex-1 flex items-center justify-center px-4 pb-20"><div className="w-full max-w-sm text-center space-y-5">
    <h1 className="font-serif text-2xl font-semibold">Verify your email</h1><p className="text-sm" style={{ color: status === 'error' ? '#ef4444' : 'var(--color-muted)' }}>{status === 'loading' ? 'Please wait…' : message}</p>
    {user && !user.emailVerified && !token && <button onClick={resend} disabled={status === 'loading'} className="w-full py-3 rounded-2xl bg-stone-900 text-white font-semibold disabled:opacity-50">Resend verification email</button>}
    <Link to="/" className="block text-sm text-amber-800">Continue to Savor</Link>
  </div></div>;
}
