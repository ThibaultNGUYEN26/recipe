import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, BadgeCheck, ShieldCheck, BarChart3, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';

const API = import.meta.env.VITE_API_URL;

export default function Header() {
  const { user, logout } = useAuth();
  const { openNotifDrawer, unreadNotifCount } = useUI();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <header className="savor-header sticky top-0 z-40 px-4 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="savor-header__brand font-serif text-2xl font-bold tracking-tight">SAVOR</span>
          <span className="savor-header__tag hidden sm:inline-block text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-full border">
            SOCIAL RECIPES
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <button onClick={openNotifDrawer}
                className="savor-header__icon-button relative p-2 rounded-full transition-colors"
                aria-label={t('header.openNotifications')}>
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="savor-header__icon-button flex items-center gap-1 p-1 rounded-full transition-colors focus:outline-none"
                  aria-label={t('header.openAccount')}
                  aria-expanded={menuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-amber-700 avatar-ring overflow-hidden">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl.startsWith('/') ? `${API}${user.avatarUrl}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                  </div>
                  <ChevronDown className="savor-header__muted w-3.5 h-3.5 hidden sm:block" />
                </button>

                {menuOpen && (
                  <div className="savor-header__menu absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border py-1.5 z-50 overflow-hidden">
                    <div className="savor-header__divider px-4 py-2.5 border-b">
                      <p className="savor-header__primary text-xs font-bold truncate">{user.name ?? t('header.chef')}</p>
                      {user.username && <p className="savor-header__muted text-[10px] truncate">@{user.username}</p>}
                      <p className="savor-header__muted text-[11px] truncate">{user.email}</p>
                    </div>

                    <Link
                      to={user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="savor-header__menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors"
                    >
                      <User className="savor-header__muted w-4 h-4" /> {t('header.viewProfile')}
                    </Link>

                    <Link to="/creator/analytics" onClick={() => setMenuOpen(false)}
                      className="savor-header__menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors">
                      <BarChart3 className="savor-header__muted w-4 h-4" /> {t('header.analytics')}
                    </Link>

                    <Link to="/settings" onClick={() => setMenuOpen(false)}
                      className="savor-header__menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors">
                      <Settings className="savor-header__muted w-4 h-4" /> {t('header.settings')}
                    </Link>

                    {user.isVerified && (
                      <Link to="/settings/verification" onClick={() => setMenuOpen(false)}
                        className="savor-header__menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors">
                        <BadgeCheck className="w-4 h-4 text-blue-500" /> {t('header.verificationStatus')}
                      </Link>
                    )}

                    {user.isAdmin && (
                      <Link to="/admin/verifications" onClick={() => setMenuOpen(false)}
                        className="savor-header__menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors">
                        <ShieldCheck className="savor-header__muted w-4 h-4" /> {t('header.verificationReview')}
                      </Link>
                    )}

                    <div className="savor-header__divider border-t my-1" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                      <LogOut className="w-4 h-4" /> {t('header.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/settings" className="savor-header__icon-button p-1.5 rounded-full transition-colors" aria-label="Settings">
                <Settings className="savor-header__muted w-5 h-5" />
              </Link>
              <Link to="/login" className="savor-header__sign-in text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                {t('header.signIn')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
