import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import RecipeCard from '../home/RecipeCard';
import type { UserProfile as UserProfileType, RecipeListItem } from '../../types';
import {
  Edit3, MapPin, Utensils, Bookmark,
  X, UserPlus, UserMinus, Camera, Crop as CropIcon
} from 'lucide-react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const API = import.meta.env.VITE_API_URL;

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me, logout, updateUser } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeListItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recipes' | 'saved'>('recipes');

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
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

  useEffect(() => {
    if (isOwnProfile && me?.avatarUrl) {
      setProfile((current) => current ? { ...current, avatarUrl: me.avatarUrl } : current);
    }
  }, [isOwnProfile, me?.avatarUrl]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const promises: Promise<unknown>[] = [
      fetch(`${API}/api/users/${userId}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/api/users/${userId}/recipes?lang=${language}`, { credentials: 'include' }).then((r) => r.json()),
    ];
    if (me) promises.push(fetch(`${API}/api/users/${userId}/followers`, { credentials: 'include' }).then((r) => r.json()));
    if (isOwnProfile) promises.push(fetch(`${API}/api/users/me/saved?lang=${language}`, { credentials: 'include' }).then((r) => r.json()));

    Promise.all(promises)
      .then(([p, r, ...rest]) => {
        const profileData = p as UserProfileType & { error?: string };
        if (profileData.error) { navigate('/'); return; }
        setProfile(profileData);
        setEditName(profileData.name ?? '');
        setEditBio(profileData.bio ?? '');
        setRecipes(Array.isArray(r) ? r as RecipeListItem[] : []);
        if (me && Array.isArray(rest[0])) {
          setIsFollowing((rest[0] as { id: number }[]).some((f) => f.id === me.id));
        }
        if (isOwnProfile && rest[1] && Array.isArray(rest[1])) {
          setSavedRecipes(rest[1] as RecipeListItem[]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, language, me?.id]);

  async function toggleFollow() {
    if (!me) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/users/${userId}/follow`, { method, credentials: 'include' });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setProfile((p) => p ? { ...p, followerCount: p.followerCount + (isFollowing ? -1 : 1) } : p);
        showToast(isFollowing ? 'Unfollowed' : 'Following!');
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('name', editName);
    fd.append('bio', editBio);
    if (editAvatar) fd.append('avatar', editAvatar);
    try {
      const res = await fetch(`${API}/api/users/me`, { method: 'PATCH', credentials: 'include', body: fd });
      if (res.ok) {
        const d = await res.json();
        setProfile((p) => p ? { ...p, name: d.user.name, bio: d.user.bio, avatarUrl: d.user.avatarUrl } : p);
        updateUser({
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
    const initial = centerCrop(makeAspectCrop({ unit: '%', width: 80 }, 1, w, h), w, h);
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
      <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" />
    </div>
  );

  if (!profile) return null;

  const tabContent = activeTab === 'recipes' ? recipes : savedRecipes;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 pb-24">

      {/* Profile header card */}
      <section className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-sm space-y-5"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">

          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-amber-800 text-white flex items-center justify-center text-3xl font-bold shrink-0 ring-4 ring-amber-700/20 shadow-md overflow-hidden">
            {profile.avatarUrl
              ? <img src={imgSrc(profile.avatarUrl)!} alt="" className="w-full h-full object-cover" />
              : profile.name?.[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-2xl font-black" style={{ color: 'var(--color-text)' }}>{profile.name ?? 'Anonymous Chef'}</h1>
              </div>
              {isOwnProfile ? (
                <button onClick={() => setIsEditOpen(true)}
                  className="flex items-center gap-1.5 bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-2xl hover:bg-amber-800 transition-colors shadow-sm">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              ) : (
                <button onClick={toggleFollow} disabled={followLoading}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-2xl transition-colors shadow-sm"
                  style={isFollowing
                    ? { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
                    : { backgroundColor: '#92400e', color: '#fff' }}>
                  {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs leading-relaxed max-w-xl" style={{ color: '#44403c' }}>{profile.bio}</p>
            )}

            {profile.createdAt && (
              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                <MapPin className="w-3.5 h-3.5 text-amber-800" />
                Joined {new Date(profile.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-100 text-center">
          {[
            { label: 'Recipes', value: profile.recipeCount },
            { label: 'Followers', value: profile.followerCount },
            { label: 'Following', value: profile.followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <p className="font-serif text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => setActiveTab('recipes')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
          style={activeTab === 'recipes'
            ? { backgroundColor: '#92400e', color: '#fff' }
            : { backgroundColor: 'var(--color-surface)', color: '#44403c', border: '1px solid var(--color-border)' }}>
          <Utensils className="w-4 h-4" />
          My Recipes ({recipes.length})
        </button>
        {isOwnProfile && (
          <button onClick={() => setActiveTab('saved')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
            style={activeTab === 'saved'
              ? { backgroundColor: '#92400e', color: '#fff' }
              : { backgroundColor: 'var(--color-surface)', color: '#44403c', border: '1px solid var(--color-border)' }}>
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
            <Link to="/add-recipe" className="mt-4 inline-block text-xs font-semibold text-amber-800 underline">Add a recipe</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tabContent.map((r) => <RecipeCard key={r.slug} recipe={r} />)}
        </div>
      )}

      {/* Avatar Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm"
          onClick={() => setCropSrc(null)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CropIcon className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif text-lg font-bold text-stone-900">Crop Profile Photo</h3>
              </div>
              <button onClick={() => setCropSrc(null)} className="p-1 text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500">Drag the circle to choose your profile area.</p>
            <div className="flex justify-center max-h-[50vh] overflow-auto rounded-2xl bg-stone-100">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
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
                className="flex-1 py-3 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={applyCrop} disabled={!completedCrop}
                className="flex-1 py-3 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
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
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-bold text-stone-900">Edit Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="p-1 text-stone-400 hover:text-stone-800">
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
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-amber-800 underline">Change photo</button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Display Name</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-800/30" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Biography</label>
                <textarea rows={3} value={editBio} onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the community about yourself…"
                  className="w-full bg-stone-50 border border-stone-200 text-xs rounded-xl p-3 focus:outline-none resize-none focus:ring-2 focus:ring-amber-800/30" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-sm disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>

            {isOwnProfile && (
              <button onClick={async () => { await logout(); navigate('/'); }}
                className="w-full pt-2 text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors">
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
