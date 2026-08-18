const API = import.meta.env.VITE_API_URL;
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  const method = (options.method ?? 'GET').toUpperCase();
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    if (options.body) headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
