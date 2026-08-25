import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ToastData, TimerData } from '../types';

interface UIContextValue {
  // Toast
  toast: ToastData | null;
  showToast: (title: string, description?: string, type?: ToastData['type'], duration?: number) => void;

  // Timer
  activeTimer: TimerData | null;
  startTimer: (title: string, minutes: number, recipeTitle: string) => void;
  stopTimer: () => void;

  // Modals
  shareTarget: ShareTarget | null;
  openShare: (target: ShareTarget) => void;
  closeShare: () => void;

  commentsTarget: CommentsTarget | null;
  openComments: (target: CommentsTarget) => void;
  closeComments: () => void;

  reportItem: { id: string; type: 'recipe' | 'comment' | 'user' } | null;
  openReport: (id: string, type: 'recipe' | 'comment' | 'user') => void;
  closeReport: () => void;

  saveModalSlug: string | null;
  openSaveModal: (slug: string) => void;
  closeSaveModal: () => void;

  notifDrawerOpen: boolean;
  openNotifDrawer: () => void;
  closeNotifDrawer: () => void;

  // Unread notification count (incremented by SSE, reset on mark-read)
  unreadNotifCount: number;
  setUnreadNotifCount: React.Dispatch<React.SetStateAction<number>>;
}

export interface ShareTarget {
  type: 'recipe' | 'profile';
  path: string;
  title: string;
  text?: string;
}

export interface CommentsTarget {
  slug: string;
  title: string;
  authorUsername?: string | null;
}

const UIContext = createContext<UIContextValue | null>(null);

let toastCounter = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimerData | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget | null>(null);
  const [reportItem, setReportItem] = useState<UIContextValue['reportItem']>(null);
  const [saveModalSlug, setSaveModalSlug] = useState<string | null>(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const showToast = useCallback((title: string, description?: string, type: ToastData['type'] = 'success', duration = 3500) => {
    const id = ++toastCounter;
    setToast({ id, title, description, type });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), duration);
  }, []);

  const startTimer = useCallback((title: string, minutes: number, recipeTitle: string) => {
    const totalSeconds = minutes * 60;
    setActiveTimer({ title, totalSeconds, remainingSeconds: totalSeconds, recipeTitle });
    const interval = setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev) { clearInterval(interval); return null; }
        if (prev.remainingSeconds <= 1) { clearInterval(interval); return null; }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => setActiveTimer(null), []);

  return (
    <UIContext.Provider value={{
      toast, showToast,
      activeTimer, startTimer, stopTimer,
      shareTarget, openShare: setShareTarget, closeShare: () => setShareTarget(null),
      commentsTarget, openComments: setCommentsTarget, closeComments: () => setCommentsTarget(null),
      reportItem, openReport: (id, type) => setReportItem({ id, type }), closeReport: () => setReportItem(null),
      saveModalSlug, openSaveModal: setSaveModalSlug, closeSaveModal: () => setSaveModalSlug(null),
      notifDrawerOpen, openNotifDrawer: () => setNotifDrawerOpen(true), closeNotifDrawer: () => setNotifDrawerOpen(false),
      unreadNotifCount, setUnreadNotifCount,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
