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

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const loaded = () => resolve();
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
  });
}

export default function GoogleSignIn({ onError }: { onError: (message: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [unavailable, setUnavailable] = useState(!clientId);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    let active = true;
    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) return onError('Google did not return a credential');
            try {
              onError('');
              await loginWithGoogle(credential);
              showToast('Welcome to Savor!');
              navigate('/');
            } catch (error) {
              onError(error instanceof Error ? error.message : 'Google sign-in failed');
            }
          },
        });
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
    return () => { active = false; };
  }, [clientId, loginWithGoogle, navigate, onError, showToast]);

  if (unavailable) return clientId ? null : (
    <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>Google sign-in is not configured.</p>
  );
  return <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />;
}
