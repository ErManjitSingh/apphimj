import API from '../api/axios';

/** VAPID public keys arrive as base64url; PushManager.subscribe wants a Uint8Array. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

/**
 * Registers THIS device/browser for push, tied to whichever user is currently authenticated
 * (the backend upsert reassigns ownership by endpoint — see notificationController.subscribePush).
 * Safe to call repeatedly (multiple tabs, every permission-grant) — same endpoint upserts, never
 * duplicates.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    const { data } = await API.get('/notifications/push/public-key', {
      skipSuccessToast: true,
      skipErrorToast: true,
    });
    if (!data?.publicKey) return false; // backend has no VAPID keys configured — no-op

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    const json = subscription.toJSON();
    await API.post(
      '/notifications/push/subscribe',
      { endpoint: json.endpoint, keys: json.keys },
      { skipSuccessToast: true, skipErrorToast: true }
    );
    return true;
  } catch {
    return false;
  }
}

/** Called on logout so this device stops receiving the signed-out user's notifications. */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  try {
    // No argument = resolve by the current page's URL, i.e. whichever registration controls
    // this page (our root-scoped sw.js) — passing the script path itself is not the right API here.
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await API.delete('/notifications/push/subscribe', {
      data: { endpoint },
      skipSuccessToast: true,
      skipErrorToast: true,
    });
  } catch {
    /* best-effort — logout should never be blocked by this */
  }
}
