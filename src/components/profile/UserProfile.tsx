import { LoadingPan } from '../ui/LoadingPan';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import RecipeCard from '../home/RecipeCard';
import type { UserProfile as UserProfileType, RecipeListItem } from '../../types';
import {
  Edit3, MapPin, Utensils, Bookmark, BarChart3,
  X, UserPlus, UserMinus, Camera, Crop as CropIcon, Share2
} from 'lucide-react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import VerifiedBadge from './VerifiedBadge';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function UserProfile({ userIdOverride }: { userIdOverride?: number } = {}) {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const userId = userIdOverride ? String(userIdOverride) : routeUserId;
  const { user: me, logout, updateUser } = useAuth();
  const { language } = useLanguage();
  const { showToast, openShare } = useUI();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListModal, setFollowListModal] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<Array<{ id: number; name: string | null; username: string | null; avatarUrl: string | null; isVerified: boolean }>>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followedInModal, setFollowedInModal] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'recipes' | 'saved'>('recipes');

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const cropImgRef = useRef<HTMLImageElement>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = me && userId && parseInt(userId) === me.id;

  const { data: profile, isLoading: queryLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const r = await apiFetch(`/api/users/${userId}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      return data as UserProfileType;
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const loading = queryLoading;

  const { data: recipes = [] } = useQuery<RecipeListItem[]>({
    queryKey: ['userRecipes', userId, language],
    queryFn: () => apiFetch(`/api/users/${userId}/recipes?lang=${language}`).then((r) => r.json()),
    enabled: Boolean(userId),
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const { data: savedRecipes = [] } = useQuery<RecipeListItem[]>({
    queryKey: ['saved', language],
    queryFn: () => apiFetch(`/api/users/me/saved?lang=${language}`).then((r) => r.json()),
    enabled: Boolean(isOwnProfile),
    select: (d) => (Array.isArray(d) ? d : []),
  });

  useEffect(() => {
    if (profile) {
      setEditName(profile.name ?? '');
      setEditUsername(profile.username ?? '');
      setEditBio(profile.bio ?? '');
    }
  }, [profile?.id]);

  useEffect(() => {
    if (isOwnProfile && me?.avatarUrl && profile) {
      queryClient.setQueryData(['profile', userId], (old: UserProfileType) =>
        old ? { ...old, avatarUrl: me.avatarUrl } : old
      );
    }
  }, [isOwnProfile, me?.avatarUrl, profile?.id]);

  useEffect(() => {
    if (!profile || !me || !userId) return;
    apiFetch(`/api/users/${userId}/followers`)
      .then((r) => r.json())
      .then((followers) => {
        if (Array.isArray(followers)) setIsFollowing(followers.some((f: { id: number }) => f.id === me.id));
      })
      .catch(() => {});
  }, [userId, me?.id]);

  useEffect(() => {
    if (!userId) return;
    const handler = (e: Event) => {
      const { followingId, followerId, delta } = (e as CustomEvent).detail as { followingId: number; followerId: number; delta: number };
      queryClient.setQueryData(['profile', userId], (old: UserProfileType) => {
        if (!old) return old;
        const patch: Partial<UserProfileType> = {};
        if (followingId === +userId) patch.followerCount = old.followerCount + delta;
        if (followerId === +userId) patch.followingCount = old.followingCount + delta;
        return Object.keys(patch).length ? { ...old, ...patch } : old;
      });
    };
    window.addEventListener('ws:user-follow', handler);
    return () => window.removeEventListener('ws:user-follow', handler);
  }, [userId, queryClient]);

  useEffect(() => {
    if (!profile) return;
    const previousTitle = document.title;
    document.title = `${profile.name ?? (profile.username ? `@${profile.username}` : 'Creator')} — Savor`;
    return () => { document.title = previousTitle; };
  }, [profile?.id]);

  async function toggleFollow() {
    if (!me) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const sourceRecipeSlug = searchParams.get('fromRecipe');
      const res = await apiFetch(`/api/users/${userId}/follow`, {
        method,
        body: method === 'POST' ? JSON.stringify({ sourceRecipeSlug }) : undefined,
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        queryClient.setQueryData(['profile', userId], (old: UserProfileType) =>
          old ? { ...old, followerCount: old.followerCount + (isFollowing ? -1 : 1) } : old
        );
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        showToast(isFollowing ? 'Unfollowed' : 'Following!');
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function openFollowList(type: 'followers' | 'following') {
    setFollowListModal(type);
    setFollowListLoading(true);
    setFollowList([]);
    try {
      const endpoint = type === 'followers'
        ? `/api/users/${userId}/followers`
        : `/api/users/${userId}/following`;
      const res = await apiFetch(endpoint);
      const data = await res.json();
      setFollowList(Array.isArray(data) ? data : []);
    } finally {
      setFollowListLoading(false);
    }
  }

  async function toggleFollowInModal(targetId: number) {
    if (!me) { navigate('/login'); return; }
    const following = !!followedInModal[targetId];
    const res = await apiFetch(`/api/users/${targetId}/follow`, { method: following ? 'DELETE' : 'POST' });
    if (res.ok) setFollowedInModal((prev) => ({ ...prev, [targetId]: !following }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('name', editName);
    fd.append('username', editUsername);
    fd.append('bio', editBio);
    if (editAvatar) fd.append('avatar', editAvatar);
    try {
      const res = await apiFetch('/api/users/me', { method: 'PATCH', body: fd });
      if (res.ok) {
        const d = await res.json();
        queryClient.setQueryData(['profile', userId], (old: UserProfileType) =>
          old ? { ...old, username: d.user.username, name: d.user.name, bio: d.user.bio, avatarUrl: d.user.avatarUrl } : old
        );
        queryClient.invalidateQueries({ queryKey: ['userRecipes', userId] });
        updateUser({
          username: d.user.username,
          name: d.user.name,
          avatarUrl: d.user.avatarUrl,
          avatarPending: d.avatarStatus === 'pending' || d.avatarStatus === 'review_required',
        });
        if (d.avatarStatus === 'approved') showToast('Profile updated!', 'Your new photo is approved.', 'success');
        else if (d.avatarStatus === 'rejected') showToast('Photo not accepted', 'Your previous profile picture is still visible. You can submit another.', 'error');
        else if (d.avatarStatus) showToast('Profile updated', 'Your new photo is private while it is reviewed.', 'info');
        else showToast('Profile updated!');
        setEditAvatar(null);
        setEditAvatarPreview(null);
        setIsEditOpen(false);
      } else {
        const d = await res.json();
        showToast(d.error ?? 'Profile update failed', undefined, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      showToast('Unsupported photo', 'Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      showToast('Photo is too large', 'Choose an image under 5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropSrc(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(f);
  }

  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const size = Math.min(80, (Math.min(w, h) / Math.max(w, h)) * 80);
    const initial = centerCrop(makeAspectCrop({ unit: '%', width: size }, 1, w, h), w, h);
    setCrop(initial);
  }

  function applyCrop() {
    const img = cropImgRef.current;
    if (!img || !completedCrop) return;
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, size, size
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      setEditAvatar(file);
      setEditAvatarPreview(URL.createObjectURL(blob));
      setCropSrc(null);
    }, 'image/png');
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingPan />
    </div>
  );

  if (!profile) { navigate('/'); return null; }

  const tabContent = activeTab === 'recipes' ? recipes : savedRecipes;

  return (
    <div className="profile-page w-full max-w-4xl mx-auto px-4 py-4 space-y-6 pb-24">

      {/* Profile header card */}
      <section className="profile-card p-6 sm:p-8 rounded-3xl border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">

          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-amber-800 text-white flex items-center justify-center text-3xl font-bold shrink-0 ring-4 ring-amber-700 avatar-ring shadow-md overflow-hidden">
            {profile.avatarUrl
              ? <img src={imgSrc(profile.avatarUrl)!} alt="" className="w-full h-full object-cover" />
              : profile.name?.[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <h1 className="font-serif text-2xl font-black" style={{ color: 'var(--color-text)' }}>{profile.name ?? 'Anonymous Chef'}</h1>
                  {profile.isVerified && <VerifiedBadge className="w-5 h-5" />}
                </div>
                {profile.username && <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>@{profile.username}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openShare({
                  type: 'profile',
                  path: profile.username ? `/u/${encodeURIComponent(profile.username)}` : `/profile/${profile.id}`,
                  title: profile.name ?? (profile.username ? `@${profile.username}` : 'Savor creator'),
                  text: profile.bio ?? `See ${profile.name ?? 'this creator'}'s recipes on Savor.`,
                })}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl border transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                {isOwnProfile ? (
                  <>
                    <Link to="/creator/analytics" className="profile-accent-soft flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl border">
                      <BarChart3 className="w-3.5 h-3.5" /> Analytics
                    </Link>
                    {!profile.isVerified && profile.followerCount > 1500 && <Link to="/settings/verification" className="profile-verification text-xs font-bold px-3 py-2 rounded-2xl border">Get verified</Link>}
                    <button onClick={() => setIsEditOpen(true)}
                      className="profile-primary flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-2xl transition-colors shadow-sm">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  </>
                ) : (
                  <button onClick={toggleFollow} disabled={followLoading}
                    className={`${isFollowing ? 'profile-secondary border' : 'profile-primary'} flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-2xl transition-colors shadow-sm`}>
                    {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="profile-muted text-xs leading-relaxed max-w-xl">{profile.bio}</p>
            )}

            {profile.createdAt && (
              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                <MapPin className="profile-accent w-3.5 h-3.5" />
                Joined {new Date(profile.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="profile-divider grid grid-cols-3 gap-2 pt-4 border-t text-center">
          {[
            { label: 'Recipes', value: profile.recipeCount, onClick: undefined },
            { label: 'Followers', value: profile.followerCount, onClick: () => openFollowList('followers') },
            { label: 'Following', value: profile.followingCount, onClick: () => openFollowList('following') },
          ].map(({ label, value, onClick }) => (
            onClick ? (
              <button key={label} onClick={onClick}
                className="p-3 rounded-2xl border text-center hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <p className="font-serif text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
              </button>
            ) : (
              <div key={label} className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <p className="font-serif text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => setActiveTab('recipes')}
          className={`profile-tab flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${activeTab === 'recipes' ? 'profile-tab--active' : ''}`}>
          <Utensils className="w-4 h-4" />
          My Recipes ({recipes.length})
        </button>
        {isOwnProfile && (
          <button onClick={() => setActiveTab('saved')}
            className={`profile-tab flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${activeTab === 'saved' ? 'profile-tab--active' : ''}`}>
            <Bookmark className="w-4 h-4" />
            Saved ({savedRecipes.length})
          </button>
        )}
      </div>

      {/* Tab content */}
      {tabContent.length === 0 ? (
        <div className="rounded-3xl p-12 text-center border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Utensils className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
          <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {activeTab === 'recipes' ? 'No recipes yet' : 'No saved recipes'}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {activeTab === 'recipes' && isOwnProfile ? 'Share your first recipe with the community!' : ''}
          </p>
          {activeTab === 'recipes' && isOwnProfile && (
            <Link to="/add-recipe" className="profile-accent mt-4 inline-block text-xs font-semibold underline">Add a recipe</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tabContent.map((r) => <RecipeCard key={r.slug} recipe={r} hideAuthor />)}
        </div>
      )}

      {/* Followers / Following modal */}
      {followListModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm"
          onClick={() => setFollowListModal(null)}>
          <div className="profile-modal w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="profile-divider flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="font-serif text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {followListModal === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button onClick={() => setFollowListModal(null)} className="profile-icon-button p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1">
              {followListLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingPan />
                </div>
              ) : followList.length === 0 ? (
                <p className="text-center text-xs py-12" style={{ color: 'var(--color-muted)' }}>
                  {followListModal === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {followList.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                      <Link to={u.username ? `/u/${encodeURIComponent(u.username)}` : `/profile/${u.id}`}
                        onClick={() => setFollowListModal(null)}
                        className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                        {u.avatarUrl
                          ? <img src={imgSrc(u.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                          : u.name?.[0]?.toUpperCase() ?? '?'}
                      </Link>
                      <Link to={u.username ? `/u/${encodeURIComponent(u.username)}` : `/profile/${u.id}`}
                        onClick={() => setFollowListModal(null)}
                        className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{u.name ?? u.username ?? 'Creator'}</p>
                          {u.isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        {u.username && <p className="text-[10px] truncate" style={{ color: 'var(--color-muted)' }}>@{u.username}</p>}
                      </Link>
                      {me && u.id !== me.id && (
                        <button onClick={() => toggleFollowInModal(u.id)}
                          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${followedInModal[u.id] ? 'profile-secondary border' : 'profile-primary'}`}>
                          {followedInModal[u.id] ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="profile-modal w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="profile-divider flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CropIcon className="profile-accent w-5 h-5" />
                <h3 className="font-serif text-lg font-bold">Crop Profile Photo</h3>
              </div>
              <button onClick={() => setCropSrc(null)} className="profile-icon-button p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="profile-muted text-xs">Drag the circle to choose your profile area.</p>
            <div className="flex justify-center max-h-[65vh] overflow-auto rounded-2xl" style={{ backgroundColor: 'var(--color-subtle)' }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                keepSelection
                className="max-w-full"
              >
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  onLoad={onCropImageLoad}
                  className="max-w-full max-h-[45vh] object-contain"
                  alt="Crop source"
                />
              </ReactCrop>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCropSrc(null)}
                className="profile-secondary flex-1 py-3 text-xs font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={applyCrop} disabled={!completedCrop}
                className="profile-primary flex-1 py-3 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                <CropIcon className="w-3.5 h-3.5" /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          onClick={() => setIsEditOpen(false)}>
          <div className="profile-modal w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="profile-divider flex items-center justify-between pb-3 border-b">
              <h3 className="font-serif text-lg font-bold">Edit Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="profile-icon-button p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20 rounded-full bg-amber-800 text-white flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer"
                  onClick={() => fileRef.current?.click()}>
                  {editAvatarPreview
                    ? <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                    : profile.avatarUrl
                      ? <img src={imgSrc(profile.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                      : profile.name?.[0]?.toUpperCase() ?? '?'}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickAvatar} />
                <button type="button" onClick={() => fileRef.current?.click()} className="profile-accent text-xs underline">Change photo</button>
              </div>

              <div className="space-y-1">
                <label className="profile-muted text-xs font-bold uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="profile-muted absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">@</span>
                  <input type="text" required minLength={3} maxLength={30} value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.replace(/^@+/, '').toLowerCase())}
                    pattern="[a-z0-9._]+" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    className="w-full bg-stone-50 border border-stone-200 text-xs font-bold rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-800/30" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="profile-muted text-xs font-bold uppercase tracking-wider">Display Name</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-800/30" />
              </div>

              <div className="space-y-1">
                <label className="profile-muted text-xs font-bold uppercase tracking-wider">Biography</label>
                <textarea rows={3} value={editBio} onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the community about yourself…"
                  className="w-full bg-stone-50 border border-stone-200 text-xs rounded-xl p-3 focus:outline-none resize-none focus:ring-2 focus:ring-amber-800/30" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)}
                  className="profile-secondary flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="profile-primary flex-1 py-2.5 text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>

            {isOwnProfile && (
              <button onClick={async () => { await logout(); navigate('/'); }}
                className="profile-danger w-full pt-2 text-xs font-semibold transition-colors">
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
