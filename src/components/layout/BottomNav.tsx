import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Bookmark, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL;

const NAV = [
  { id: 'home', to: '/', label: 'Home', icon: Home },
  { id: 'search', to: '/search', label: 'Discover', icon: Search },
  { id: 'add', to: '/add-recipe', label: 'Add', icon: PlusCircle, authRequired: true },
  { id: 'saved', to: '/my-recipes', label: 'Saved', icon: Bookmark, authRequired: true },
  { id: 'profile', to: '/profile', label: 'Profile', icon: UserIcon, authRequired: true },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  function renderIcon(id: string, Icon: React.FC<{ className?: string; strokeWidth?: number }>, isActive: boolean, size: 'sm' | 'lg') {
    const cls = size === 'sm' ? 'w-5 h-5' : 'w-4 h-4';
    if (id === 'profile' && user) {
      return (
        <div className={`rounded-full overflow-hidden bg-amber-800 text-white flex items-center justify-center font-bold shrink-0 ${size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-4 h-4 text-[9px]'} ${isActive ? 'ring-2 ring-amber-700' : ''}`}>
          {user.avatarUrl
            ? <img src={user.avatarUrl.startsWith('/') ? `${API}${user.avatarUrl}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
            : user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
        </div>
      );
    }
    return <Icon className={`${cls} ${isActive && size === 'sm' ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 1.8} />;
  }

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden py-2 px-3 shadow-lg"
        style={{ backgroundColor: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(214,211,209,0.9)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-around max-w-md mx-auto">
          {NAV.map(({ id, to, label, icon: Icon, authRequired }) => {
            const dest = id === 'profile' && user ? (user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`) : to;
            const href = (authRequired && !user) ? '/login' : dest;
            const isActive = id === 'home'
              ? location.pathname === '/'
              : id === 'profile'
                ? location.pathname.startsWith('/profile') || location.pathname.startsWith('/u/')
                : location.pathname.startsWith(to);
            return (
              <Link key={id} to={href}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative"
                style={{ color: isActive ? '#92400e' : '#78716c' }}>
                {isActive && <span className="absolute -top-1 w-1 h-1 bg-amber-700 rounded-full" />}
                {renderIcon(id, Icon, isActive, 'sm')}
                <span className="text-[10px] mt-1 font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop floating pill */}
      <div className="hidden sm:block fixed bottom-6 left-1/2 -translate-x-1/2 z-40 py-2 px-3 rounded-full shadow-2xl"
        style={{ backgroundColor: 'rgba(28,25,23,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(68,64,60,0.5)' }}>
        <div className="flex items-center gap-1">
          {NAV.map(({ id, to, label, icon: Icon, authRequired }) => {
            const dest = id === 'profile' && user ? (user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`) : to;
            const href = (authRequired && !user) ? '/login' : dest;
            const isActive = id === 'home'
              ? location.pathname === '/'
              : id === 'profile'
                ? location.pathname.startsWith('/profile') || location.pathname.startsWith('/u/')
                : location.pathname.startsWith(to);
            return (
              <Link key={id} to={href}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={isActive ? { backgroundColor: '#d97706', color: '#fff' } : { color: '#a8a29e' }}>
                {renderIcon(id, Icon, isActive, 'lg')}
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
