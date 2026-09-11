import { useEffect } from 'react';
import { authStorage } from '../auth/authStorage';

/**
 * Best-effort "tab closed" signal via navigator.sendBeacon on pagehide.
 * sendBeacon can't set an Authorization header, so the token travels in the
 * request body instead — the backend verifies it there exactly as protect()
 * would. This is best-effort only: if the browser is killed outright the
 * beacon may never fire, and the session is then closed later by the
 * server-side reconciliation sweep (inactivity timeout), never by a guessed
 * timestamp. Sales executives only, matching useSessionHeartbeat.
 */
export function useSessionBeacon(user) {
  useEffect(() => {
    if (!user || user.role !== 'sales_executive') return undefined;

    const handler = () => {
      const token = authStorage.getToken();
      if (!token || typeof navigator.sendBeacon !== 'function') return;
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const url = `${baseURL}/auth/session/beacon`;
      const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    };

    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [user]);
}
