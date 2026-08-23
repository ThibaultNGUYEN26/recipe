import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Bell, ChefHat, Heart, MessageSquare, UserPlus, Star, CheckCheck } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

interface Notification {
  id: number;
  type: 'follow' | 'comment' | 'rating' | 'like' | 'made_it';
  read: boolean;
  message: string | null;
  createdAt: string;
  actor: { id: number; name: string | null; avatarUrl: string | null };
  recipeSlug: string | null;
  recipeTitle: string | null;
}

type TFn = (key: string, values?: Record<string, string>) => string;

const TYPE_ICON: Record<string, React.ReactNode> = {
  follow: <UserPlus className="w-3.5 h-3.5 text-amber-700" />,
  comment: <MessageSquare className="w-3.5 h-3.5 text-sky-500" />,
  rating: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />,
  like: <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />,
  made_it: <ChefHat className="w-3.5 h-3.5 text-amber-700" />,
};

function TYPE_MESSAGE(t: TFn, type: string, actorName: string | null, recipeTitle: string | null) {
  const name = actorName ?? t('notif.someone');
  switch (type) {
    case 'follow': return t('notif.follow', { name });
    case 'comment': return recipeTitle ? t('notif.comment', { name, title: recipeTitle }) : t('notif.commentNoRecipe', { name });
    case 'rating': return recipeTitle ? t('notif.rating', { name, title: recipeTitle }) : t('notif.ratingNoRecipe', { name });
    case 'made_it': return recipeTitle ? t('notif.madeIt', { name, title: recipeTitle }) : t('notif.madeItNoRecipe', { name });
    default: return recipeTitle ? t('notif.other', { name, title: recipeTitle }) : t('notif.otherNoRecipe', { name });
  }
}

function timeAgo(dateStr: string, t: TFn) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('notif.timeJustNow');
  if (m < 60) return t('notif.timeMinutes', { m: String(m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notif.timeHours', { h: String(h) });
  return t('notif.timeDays', { d: String(Math.floor(h / 24)) });
}

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function NotificationDrawer() {
  const { notifDrawerOpen, closeNotifDrawer, unreadNotifCount, setUnreadNotifCount } = useUI();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadNotifCount(0);
      return;
    }
    apiFetch('/api/notifications/unread-count')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (typeof data?.count === 'number') setUnreadNotifCount(data.count); })
      .catch(console.error);
  }, [user?.id, setUnreadNotifCount]);

  useEffect(() => {
    if (!notifDrawerOpen || !user) return;
    setLoading(true);
    apiFetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        setNotifications(Array.isArray(d) ? d : []);
        // Sync count from fetched data
        const unread = Array.isArray(d) ? d.filter((n: Notification) => !n.read).length : 0;
        setUnreadNotifCount(unread);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [notifDrawerOpen, user]);

  // WS — listen for new notifications dispatched by useRecipeSocket
  useEffect(() => {
    if (!user) return;
    const handler = (e: Event) => {
      const n = (e as CustomEvent).detail as Notification;
      setNotifications((prev) => prev.some((item) => item.id === n.id) ? prev : [n, ...prev]);
      if (!n.read) setUnreadNotifCount((c) => c + 1);
    };
    window.addEventListener('ws:notification', handler);
    const countHandler = (event: Event) => setUnreadNotifCount((event as CustomEvent<number>).detail);
    window.addEventListener('ws:notification-count', countHandler);
    return () => {
      window.removeEventListener('ws:notification', handler);
      window.removeEventListener('ws:notification-count', countHandler);
    };
  }, [user?.id]);

  async function markAllRead() {
    await apiFetch('/api/notifications/read', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifCount(0);
  }

  async function markOneRead(id: number) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadNotifCount((c) => Math.max(0, c - 1));
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  }

  if (!notifDrawerOpen) return null;

  const unreadCount = unreadNotifCount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/50 backdrop-blur-sm"
      onClick={closeNotifDrawer}>
      <div
        className="w-full max-w-md h-full min-w-0 shadow-2xl flex flex-col border-l pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
        style={{ backgroundColor: '#FAF8F5', borderColor: 'rgba(214,211,209,0.8)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="responsive-stack-narrow px-4 sm:px-5 py-4 flex items-center justify-between gap-2"
          style={{ borderBottom: '1px solid rgba(214,211,209,0.8)', backgroundColor: '#FAF8F5' }}>
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="w-5 h-5 text-amber-700" />
            <h2 className="font-serif text-lg font-bold text-stone-900">{t('notif.title')}</h2>
            {unreadCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex self-end items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 hover:bg-amber-50 px-2.5 py-1 rounded-xl transition-colors">
                <CheckCheck className="w-3.5 h-3.5" /> {t('notif.markAllRead')}
              </button>
            )}
            <button onClick={closeNotifDrawer}
              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2">
          {loading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-3/4" />
                    <div className="h-2.5 bg-stone-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <Bell className="w-10 h-10 stroke-1 mb-2 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">{t('notif.emptyTitle')}</p>
              <p className="text-xs text-stone-400 mt-1">{t('notif.emptyHint')}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id}
                onClick={() => { if (!n.read) markOneRead(n.id); }}
                className={`flex items-start gap-3 p-3.5 rounded-2xl transition-colors cursor-pointer ${!n.read ? 'bg-amber-50/50 hover:bg-amber-50/80' : 'hover:bg-stone-50'}`}>

                {/* Actor avatar + type icon badge */}
                <div className="relative shrink-0">
                  {n.type === 'follow' ? (
                    <Link to={`/profile/${n.actor.id}`} onClick={closeNotifDrawer}>
                      <div className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold overflow-hidden">
                        {n.actor.avatarUrl
                          ? <img src={imgSrc(n.actor.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                          : n.actor.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    </Link>
                  ) : (
                    <Link to={n.recipeSlug ? `/recipe/${n.recipeSlug}` : '#'} onClick={closeNotifDrawer}>
                      <div className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold overflow-hidden">
                        {n.actor.avatarUrl
                          ? <img src={imgSrc(n.actor.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                          : n.actor.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    </Link>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-stone-200">
                    {TYPE_ICON[n.type] ?? TYPE_ICON.like}
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone-800 leading-snug">
                    {n.message || TYPE_MESSAGE(t, n.type, n.actor.name, n.recipeTitle)}
                  </p>
                  <p className="text-[10px] text-stone-400 font-medium mt-1">{timeAgo(n.createdAt, t)}</p>
                </div>

                {!n.read && <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-1" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
