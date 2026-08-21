import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Bookmark, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const API = import.meta.env.VITE_API_URL;

const NAV = [
  { id: 'home', to: '/', labelKey: 'nav.home', icon: Home },
  { id: 'search', to: '/search', labelKey: 'nav.discover', icon: Search },
  { id: 'add', to: '/add-recipe', labelKey: 'nav.add', icon: PlusCircle, authRequired: true },
  { id: 'saved', to: '/my-recipes', labelKey: 'nav.saved', icon: Bookmark, authRequired: true },
  { id: 'profile', to: '/profile', labelKey: 'nav.profile', icon: UserIcon, authRequired: true },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  function renderIcon(id: string, Icon: React.FC<{ className?: string; strokeWidth?: number }>, isActive: boolean, size: 'sm' | 'lg') {
    const cls = size === 'sm' ? 'w-5 h-5' : 'w-4 h-4';
    if (id === 'profile' && user) {
      return (
        <div className={`rounded-full overflow-hidden bg-amber-800 text-white flex items-center justify-center font-bold shrink-0 ${size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-4 h-4 text-[9px]'} ring-2 ring-amber-700 avatar-ring`}>
          {user.avatarUrl
            ? <img src={user.avatarUrl.startsWith('/') ? `${API}${user.avatarUrl}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
            : user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
        </div>
      );
    }
    return <Icon className={`${cls} ${isActive && size === 'sm' ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 1.8} />;
  }

  return (
    <nav aria-label="Primary navigation" className="savor-bottom-nav fixed z-40 py-1.5 px-2 rounded-full shadow-2xl"
      style={{
        backgroundColor: 'rgba(28,25,23,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(68,64,60,0.5)',
      }}>
      <div className="savor-bottom-nav__items flex items-center gap-0.5">
        {NAV.map(({ id, to, labelKey, icon: Icon, authRequired }) => {
          const dest = id === 'profile' && user ? (user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`) : to;
          const href = (authRequired && !user) ? '/login' : dest;
          const isActive = id === 'home'
            ? location.pathname === '/'
            : id === 'profile'
              ? location.pathname.startsWith('/profile') || location.pathname.startsWith('/u/')
              : location.pathname.startsWith(to);
          return (
            <Link key={id} to={href}
              className="savor-bottom-nav__item flex items-center justify-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
              aria-current={isActive ? 'page' : undefined}
              style={isActive ? { backgroundColor: '#d97706', color: '#fff' } : { color: '#a8a29e' }}>
              {renderIcon(id, Icon, isActive, 'lg')}
              <span className="savor-bottom-nav__label">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
