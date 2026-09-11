import { useEffect } from 'react';
import API from '../api/axios';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/**
 * Keeps this device's UserSession.lastActivityAt fresh while the tab is open
 * and visible, even if the user isn't triggering any other API calls (e.g.
 * just reading a report). Any real API call already refreshes it too — this
 * only covers the idle-but-open gap. Sales executives only: other roles
 * already carry a 30-minute JWT expiry that makes this unnecessary.
 */
export function useSessionHeartbeat(user) {
  useEffect(() => {
    if (!user || user.role !== 'sales_executive') return undefined;

    const send = () => {
      if (document.visibilityState !== 'visible') return;
      API.patch('/auth/session/heartbeat', null, {
        skipSuccessToast: true,
        skipErrorToast: true,
      }).catch(() => {});
    };

    send();
    const intervalId = window.setInterval(send, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', send);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', send);
    };
  }, [user]);
}
