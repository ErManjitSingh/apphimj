import { useEffect, useState } from 'react';

export const APP_GREETING = 'Welcome to Travel CRM';

/** Fixed brand greeting for dashboards / login */
export function getTimeGreeting() {
  return APP_GREETING;
}

/** Static brand greeting (no time-of-day swap) */
export function useTimeGreeting() {
  const [greeting, setGreeting] = useState(() => getTimeGreeting());

  useEffect(() => {
    setGreeting(getTimeGreeting());
  }, []);

  return greeting;
}
