import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
          renderButton(element: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}

const SCRIPT_ID = 'google-identity-services';
type CredentialResponse = { credential?: string };

let googleIdentityPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let activeCredentialHandler: ((response: CredentialResponse) => void) | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const loaded = () => window.google?.accounts.id
      ? resolve()
      : reject(new Error('Google sign-in loaded without its identity API'));
    const failed = () => reject(new Error('Could not load Google sign-in'));
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    googleIdentityPromise = null;
    throw error;
  });
  return googleIdentityPromise;
}

function initializeGoogleIdentity(clientId: string) {
  if (!window.google?.accounts.id || initializedClientId === clientId) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => activeCredentialHandler?.(response),
  });
  initializedClientId = clientId;
}

export default function GoogleSignIn({ onError }: { onError: (message: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [unavailable, setUnavailable] = useState(!clientId);
  const dependenciesRef = useRef({ loginWithGoogle, navigate, onError, showToast });
  dependenciesRef.current = { loginWithGoogle, navigate, onError, showToast };

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    let active = true;
    const credentialHandler = async ({ credential }: CredentialResponse) => {
      if (!credential) return dependenciesRef.current.onError('Google did not return a credential');
      try {
        dependenciesRef.current.onError('');
        await dependenciesRef.current.loginWithGoogle(credential);
        dependenciesRef.current.showToast('Welcome to Savor!');
        dependenciesRef.current.navigate('/');
      } catch (error) {
        dependenciesRef.current.onError(error instanceof Error ? error.message : 'Google sign-in failed');
      }
    };
    activeCredentialHandler = credentialHandler;
    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonRef.current || !window.google) return;
        initializeGoogleIdentity(clientId);
        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(buttonRef.current.clientWidth || 360, 400),
        });
      })
      .catch((error) => {
        if (active) {
          setUnavailable(true);
          onError(error instanceof Error ? error.message : 'Could not load Google sign-in');
        }
      });
    return () => {
      active = false;
      if (activeCredentialHandler === credentialHandler) activeCredentialHandler = null;
    };
  }, [clientId]);

  if (unavailable) return clientId ? null : (
    <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>Google sign-in is not configured.</p>
  );
  return <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />;
}
