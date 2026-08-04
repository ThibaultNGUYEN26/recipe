import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useUI();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      showToast(t('login.toast'));
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.failed'));
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
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>{t('login.welcome')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{t('login.subtitle')}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="login-identifier" className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>{t('login.identifier')}</label>
            <input id="login-identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder={t('login.identifierPlaceholder')}
              autoComplete="username" autoCapitalize="none" spellCheck={false}
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>{t('login.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          {error && <p className="text-xs text-red-500 px-1">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-stone-900 disabled:opacity-50 transition-opacity mt-2">
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-amber-800">{t('login.signUp')}</Link>
        </p>
      </div>
    </div>
  );
}
