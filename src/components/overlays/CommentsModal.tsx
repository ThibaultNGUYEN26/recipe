import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Send, X } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../lib/apiFetch';
import type { Comment } from '../../types';
import VerifiedBadge from '../profile/VerifiedBadge';
import { LoadingPan } from '../ui/LoadingPan';

const API = import.meta.env.VITE_API_URL;

function avatarUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function CommentRow({ comment, slug, onChanged, nested = false }: { comment: Comment; slug: string; onChanged: () => void; nested?: boolean }) {
  const { user } = useAuth();
  const { language } = useLanguage();

  async function toggleLike() {
    if (!user) return;
    const response = await apiFetch(`/api/recipes/${slug}/comments/${comment.id}/like`, { method: 'POST' });
    if (response.ok) onChanged();
  }

  return (
    <div className={nested ? 'ml-11' : ''}>
      <div className="flex gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold">
          {comment.author.avatarUrl
            ? <img src={avatarUrl(comment.author.avatarUrl)!} alt="" className="h-full w-full object-cover" />
            : comment.author.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold">{comment.author.name ?? 'Savor Chef'}</span>
            {comment.author.isVerified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
            <span className="ml-auto shrink-0 text-[10px]" style={{ color: 'var(--color-muted)' }}>{new Date(comment.createdAt).toLocaleDateString(language)}</span>
          </div>
          <p className="mt-0.5 text-sm leading-relaxed break-words">{comment.text}</p>
          <button onClick={toggleLike} className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: comment.isLiked ? '#e11d48' : 'var(--color-muted)' }}>
            <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-rose-600' : ''}`} />
            {comment.likesCount > 0 && comment.likesCount}
          </button>
        </div>
      </div>
      {comment.replies.length > 0 && <div className="mt-3 space-y-3">{comment.replies.map((reply) => <CommentRow key={reply.id} comment={reply} slug={slug} onChanged={onChanged} nested />)}</div>}
    </div>
  );
}

export default function CommentsModal() {
  const { commentsTarget, closeComments } = useUI();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const slug = commentsTarget?.slug;
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', slug],
    queryFn: () => apiFetch(`/api/recipes/${slug}/comments`).then((response) => response.json()),
    enabled: Boolean(slug),
    select: (data) => Array.isArray(data) ? data : [],
  });

  if (!commentsTarget) return null;
  const recipePath = commentsTarget.authorUsername
    ? `/${encodeURIComponent(commentsTarget.authorUsername)}/${encodeURIComponent(commentsTarget.slug)}#comments`
    : `/recipe/${encodeURIComponent(commentsTarget.slug)}#comments`;

  async function submit() {
    if (!text.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/recipes/${commentsTarget!.slug}/comments`, { method: 'POST', body: JSON.stringify({ text: text.trim() }) });
      if (response.ok) {
        setText('');
        await queryClient.invalidateQueries({ queryKey: ['comments', commentsTarget!.slug] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function dismiss() {
    setText('');
    closeComments();
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55" onClick={dismiss}>
      <section className="app-modal-panel flex h-[78dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border shadow-2xl" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }} onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <MessageCircle className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-bold">{t('comments.title')}</h2>
            <Link to={recipePath} onClick={dismiss} className="block truncate text-xs hover:underline" style={{ color: 'var(--color-muted)' }}>{commentsTarget.title}</Link>
          </div>
          <button onClick={dismiss} aria-label={t('comments.close')} className="p-1" style={{ color: 'var(--color-muted)' }}><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? <div className="flex h-full items-center justify-center"><LoadingPan /></div> : comments.length ? (
            <div className="space-y-5">{comments.map((comment) => <CommentRow key={comment.id} comment={comment} slug={commentsTarget.slug} onChanged={() => queryClient.invalidateQueries({ queryKey: ['comments', commentsTarget.slug] })} />)}</div>
          ) : <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle className="mb-3 h-10 w-10 opacity-25" /><p className="font-semibold">{t('comments.empty')}</p><p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>{t('comments.emptyHint')}</p></div>}
        </div>
        <footer className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
          {user ? <div className="flex items-center gap-2"><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder={t('comments.placeholder')} className="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm outline-none" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }} /><button onClick={submit} disabled={!text.trim() || submitting} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
            : <Link to="/login" onClick={dismiss} className="block text-center text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>{t('comments.signIn')}</Link>}
        </footer>
      </section>
    </div>
  );
}
