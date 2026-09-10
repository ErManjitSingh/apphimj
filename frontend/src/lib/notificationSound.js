/**
 * Centralized notification-sound player, called from exactly one place: NotificationContext's
 * socket `notification:new` handler, which is already the single point where a genuinely new
 * notification is detected (as opposed to a polling refetch or cache invalidation). A shared
 * Audio instance is reused across calls so back-to-back notifications each restart the sound
 * cleanly from the beginning instead of overlapping indefinitely.
 *
 * Browsers block audio playback until the user has interacted with the page at least once —
 * play() then rejects with a NotAllowedError. That rejection (and any other playback error) is
 * swallowed here so it can never crash the app or surface as an unhandled promise rejection.
 * Nothing is cached/remembered about that failure, so the very next notification simply tries
 * again; once the browser allows audio (after any click/keypress anywhere on the page) that
 * later attempt succeeds on its own — no separate permission flow needed for this.
 */
const SOUND_URL = '/notification-sound.wav';

let audio = null;

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
  }
  return audio;
}

export function playNotificationSound() {
  const el = getAudio();
  if (!el) return;
  try {
    el.currentTime = 0;
  } catch {
    /* not yet loaded — play() still starts from the beginning */
  }
  try {
    el.play()?.catch(() => {
      /* autoplay blocked or playback interrupted — ignored by design, see module docblock */
    });
  } catch {
    /* defensive: some environments can throw synchronously rather than reject */
  }
}
