import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import UserProfile from './UserProfile';

const API = import.meta.env.VITE_API_URL;

export default function UsernameProfile() {
  const { username } = useParams<{ username: string }>();
  const [userId, setUserId] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setUserId(null);
    setNotFound(false);
    fetch(`${API}/api/users/by-username/${encodeURIComponent(username)}`)
      .then(async (response) => {
        if (response.status === 404) { setNotFound(true); return null; }
        if (!response.ok) throw new Error('Failed to load profile');
        return response.json();
      })
      .then((profile) => profile && setUserId(profile.id))
      .catch(() => setNotFound(true));
  }, [username]);

  if (notFound) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-serif text-xl font-bold" style={{ color: 'var(--color-text)' }}>Profile not found</h1>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>This creator may have changed their username.</p>
      <Link to="/search" className="text-sm font-semibold text-amber-800 underline">Discover creators</Link>
    </div>
  );

  if (!userId) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" />
    </div>
  );

  return <UserProfile userIdOverride={userId} />;
}
