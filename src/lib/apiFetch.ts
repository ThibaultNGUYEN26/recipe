import { getStoredToken } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL;

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    if (options.body) headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
