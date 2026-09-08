import { useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const THROTTLE_MS = 15 * 60 * 1000;

/** Fires a lightweight "module opened" beacon once per module per 15 min — never on every re-render. */
export function useLogModuleOpened(moduleName) {
  const { user } = useAuth();

  useEffect(() => {
    if (!moduleName || user?.role !== 'sales_executive') return;
    const key = `moduleOpened:${moduleName}`;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(key) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last < THROTTLE_MS) return;
    try {
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* ignore */
    }
    API.post('/sales-executive/activity/module-opened', { module: moduleName }, { skipSuccessToast: true }).catch(() => {});
  }, [moduleName, user?.role]);
}
