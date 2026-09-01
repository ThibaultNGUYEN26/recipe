import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { ArrowLeft, Camera } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EditProfile() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useUI();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(user?.tiktokUrl ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(user?.youtubeUrl ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) { navigate('/login'); return null; }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      showToast('Unsupported photo', 'Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      showToast('Photo is too large', 'Choose an image under 5 MB.', 'error');
      return;
    }
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.append('name', name);
    fd.append('username', username);
    fd.append('bio', bio);
    fd.append('instagramUrl', instagramUrl);
    fd.append('tiktokUrl', tiktokUrl);
    fd.append('youtubeUrl', youtubeUrl);
    if (avatarFile) fd.append('avatar', avatarFile);
    try {
      const res = await apiFetch('/api/users/me', { method: 'PATCH', body: fd });
      if (res.ok) {
        const d = await res.json();
        updateUser({
          username: d.user.username,
          name: d.user.name,
          bio: d.user.bio,
          instagramUrl: d.user.instagramUrl,
          tiktokUrl: d.user.tiktokUrl,
          youtubeUrl: d.user.youtubeUrl,
          avatarUrl: d.user.avatarUrl,
          avatarPending: d.avatarStatus === 'pending' || d.avatarStatus === 'review_required',
        });
        if (d.avatarStatus === 'approved') showToast('Profile updated!', 'Your new photo is approved.', 'success');
        else if (d.avatarStatus === 'rejected') {
          const reasons: Record<string, string> = {
            nudity: 'Your photo contains nudity or explicit content.',
            gore: 'Your photo contains violent or graphic content.',
            weapon: 'Your photo contains weapons.',
            drug: 'Your photo contains drug-related content.',
            hate: 'Your photo contains hate symbols.',
          };
          const reason = d.avatarRejectionCategory ? (reasons[d.avatarRejectionCategory] ?? 'Your photo violates our content policy.') : 'Your photo violates our content policy.';
          showToast('Photo rejected', reason, 'error');
        }
        else if (d.avatarStatus) showToast('Profile updated', 'Your new photo is private while it is reviewed.', 'info');
        else showToast('Profile updated!');
        navigate(`/profile/${user.id}`);
      } else {
        const d = await res.json();
        showToast(d.error ?? 'Update failed', undefined, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--color-muted)' }}><ArrowLeft size={20} /></button>
        <h1 className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Edit Profile</h1>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 rounded-full bg-amber-800 text-white flex items-center justify-center text-3xl font-bold overflow-hidden cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <span>{user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}</span>}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickFile} />
        <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-amber-800 underline">Change photo</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Username</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/^@+/, '').toLowerCase())}
              required minLength={3} maxLength={30} pattern="[a-z0-9._]+" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              className="w-full pl-8 pr-4 py-3 rounded-2xl text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{t('profile.socialLinks')}</legend>
          <input type="url" maxLength={300} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/your-profile"
            aria-label="Instagram profile URL" className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <input type="url" maxLength={300} value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@your-profile"
            aria-label="TikTok profile URL" className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <input type="url" maxLength={300} value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@your-channel"
            aria-label="YouTube channel URL" className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </fieldset>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-muted)' }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell the community about yourself…"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full mt-6 py-3.5 rounded-2xl font-medium text-white bg-stone-900 disabled:opacity-50 transition-opacity">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button onClick={handleLogout}
        className="w-full mt-3 py-3 rounded-2xl font-medium text-sm transition-colors"
        style={{ color: '#ef4444', border: '1px solid #fecaca' }}>
        Sign out
      </button>
    </div>
  );
}
