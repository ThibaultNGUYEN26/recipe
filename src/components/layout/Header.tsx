import { Link, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, LogOut, User, ChevronDown, BadgeCheck, ShieldCheck, BarChart3 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const API = import.meta.env.VITE_API_URL;

export default function Header() {
  const { user, logout } = useAuth();
  const { openNotifDrawer, unreadNotifCount } = useUI();
  const { language, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
    <header className="sticky top-0 z-40 px-4 py-3 transition-all"
      style={{ backgroundColor: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(214,211,209,0.8)' }}>
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-stone-900">SAVOR</span>
          <span className="hidden sm:inline-block text-[10px] font-semibold tracking-widest uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full border border-amber-200/60">
            SOCIAL RECIPES
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              {/* Notifications */}
              <button onClick={openNotifDrawer}
                className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Avatar → dropdown menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1 p-1 rounded-full hover:bg-stone-200/50 transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-amber-600/30 overflow-hidden">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl.startsWith('/') ? `${API}${user.avatarUrl}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 hidden sm:block" />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border border-stone-200/80 py-1.5 z-50 overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    {/* User info */}
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">{user.name ?? 'Chef'}</p>
                      {user.username && <p className="text-[10px] text-stone-500 truncate">@{user.username}</p>}
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    </div>

                    {/* Profile link */}
                    <Link
                      to={user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-500" />
                      View profile
                    </Link>

                    <Link to="/creator/analytics" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                      <BarChart3 className="w-4 h-4 text-stone-500" /> Creator analytics
                    </Link>

                    {user.isVerified && (
                      <Link to="/settings/verification" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                        <BadgeCheck className="w-4 h-4 text-blue-500" /> Verification status
                      </Link>
                    )}

                    {user.isAdmin && (
                      <Link to="/admin/verifications" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                        <ShieldCheck className="w-4 h-4 text-stone-500" /> Verification review
                      </Link>
                    )}

                    <div className="border-t border-stone-100 my-1" />

                    {/* Theme toggle */}
                    <button
                      onClick={toggleTheme}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? <Sun className="w-4 h-4 text-stone-500" /> : <Moon className="w-4 h-4 text-stone-500" />}
                        {isDark ? 'Light mode' : 'Dark mode'}
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                        {isDark ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    {/* Language toggle */}
                    <button
                      onClick={() => { toggleLanguage(); setMenuOpen(false); }}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{language === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                        {language === 'fr' ? 'Français' : 'English'}
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                        {language.toUpperCase()}
                      </span>
                    </button>

                    <div className="border-t border-stone-100 my-1" />

                    {/* Sign out */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Theme + language still accessible when logged out */}
              <button onClick={toggleTheme} className="p-2 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors text-sm">
                {isDark ? '☀️' : '🌙'}
              </button>
              <button onClick={toggleLanguage}
                className="text-[11px] font-semibold px-2 py-1 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors">
                {language === 'fr' ? 'EN' : 'FR'}
              </button>
              <Link to="/login"
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-900 text-white hover:bg-amber-900 transition-colors">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
