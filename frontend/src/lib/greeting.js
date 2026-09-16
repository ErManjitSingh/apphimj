import { APP_GREETING } from '../config/branding';

export { APP_GREETING };

/** Fixed brand greeting for dashboards / login */
export function getTimeGreeting() {
  return APP_GREETING;
}

/** Static brand greeting (no time-of-day swap) */
export function useTimeGreeting() {
  return APP_GREETING;
}
