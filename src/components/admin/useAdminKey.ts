/**
 * The admin key lives in sessionStorage ONLY — never localStorage (it would outlive
 * the browser tab and linger on a shared iPad), never the URL (it would end up in
 * history/screenshots/shared links).
 */
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'kaiju-admin-key';

function readStored(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function useAdminKey(): { key: string; setKey: (next: string) => void } {
  const [key, setKeyState] = useState<string>(readStored);

  const setKey = useCallback((next: string) => {
    setKeyState(next);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked (private mode) — the key still works for this page load */
    }
  }, []);

  return { key, setKey };
}
