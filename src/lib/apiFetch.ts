const API = import.meta.env.VITE_API_URL;
let csrfToken: string | null = null;
let csrfRefresh: Promise<string | null> | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function refreshCsrfToken(): Promise<string | null> {
  if (!csrfRefresh) {
    csrfRefresh = fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        csrfToken = data.csrfToken ?? null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => { csrfRefresh = null; });
  }
  return csrfRefresh;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutation && !csrfToken) await refreshCsrfToken();

  const send = () => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> ?? {}),
    };
    if (csrfToken && mutation) {
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
  };

  let response = await send();
  if (mutation && response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    if (body?.error === 'Missing CSRF token' || body?.error === 'Invalid CSRF token') {
      csrfToken = null;
      if (await refreshCsrfToken()) response = await send();
    }
  }
  return response;
}
