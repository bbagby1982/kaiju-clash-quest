import { useState, useCallback, useEffect, useRef } from 'react';
import { GameProgress } from '@/types/game';

const CLOUD_SAVE_KEY = 'kaiju-cloud-save-profile';
const AUTOLOAD_FLAG_KEY = 'kaiju-cloud-autoloaded';

interface CloudProfile {
  playerName: string;
  secretCode: string;
  lastSynced: string | null;
}

interface CloudSaveState {
  isLoggedIn: boolean;
  playerName: string | null;
  isSaving: boolean;
  isLoading: boolean;
  lastSynced: string | null;
  error: string | null;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Browser';
}

export function useCloudSave() {
  const [state, setState] = useState<CloudSaveState>({
    isLoggedIn: false,
    playerName: null,
    isSaving: false,
    isLoading: false,
    lastSynced: null,
    error: null,
  });

  // Load profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CLOUD_SAVE_KEY);
    if (saved) {
      try {
        const profile: CloudProfile = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          playerName: profile.playerName,
          lastSynced: profile.lastSynced,
        }));
      } catch {
        localStorage.removeItem(CLOUD_SAVE_KEY);
      }
    }
  }, []);

  const getProfile = useCallback((): CloudProfile | null => {
    const saved = localStorage.getItem(CLOUD_SAVE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }, []);

  // Sign up / login
  const login = useCallback(async (playerName: string, secretCode: string): Promise<{ success: boolean; progress?: GameProgress; isNew?: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try to load existing save
      const res = await fetch(`/api/cloud-save?player=${encodeURIComponent(playerName)}&code=${encodeURIComponent(secretCode)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        // Existing save found!
        const profile: CloudProfile = { playerName, secretCode, lastSynced: data.lastSaved };
        localStorage.setItem(CLOUD_SAVE_KEY, JSON.stringify(profile));
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          playerName,
          lastSynced: data.lastSaved,
          isLoading: false,
        }));
        return { success: true, progress: data.progress, isNew: false };
      }

      if (data.code === 'NOT_FOUND') {
        // New player — just save the profile, they'll save after first action
        const profile: CloudProfile = { playerName, secretCode, lastSynced: null };
        localStorage.setItem(CLOUD_SAVE_KEY, JSON.stringify(profile));
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          playerName,
          lastSynced: null,
          isLoading: false,
        }));
        return { success: true, isNew: true };
      }

      if (data.code === 'WRONG_CODE') {
        setState(prev => ({ ...prev, isLoading: false, error: 'Wrong secret code!' }));
        return { success: false, error: 'Wrong secret code! Did you forget it?' };
      }

      setState(prev => ({ ...prev, isLoading: false, error: data.error }));
      return { success: false, error: data.error };
    } catch {
      setState(prev => ({ ...prev, isLoading: false, error: 'Network error — are you online?' }));
      return { success: false, error: 'Network error — are you online?' };
    }
  }, []);

  // Save progress to cloud
  const saveToCloud = useCallback(async (progress: GameProgress): Promise<boolean> => {
    const profile = getProfile();
    if (!profile) return false;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const res = await fetch('/api/cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: profile.playerName,
          secretCode: profile.secretCode,
          progress,
          device: getDeviceName(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updated = { ...profile, lastSynced: data.lastSaved };
        localStorage.setItem(CLOUD_SAVE_KEY, JSON.stringify(updated));
        setState(prev => ({ ...prev, isSaving: false, lastSynced: data.lastSaved }));
        return true;
      }

      setState(prev => ({ ...prev, isSaving: false, error: data.error }));
      return false;
    } catch {
      setState(prev => ({ ...prev, isSaving: false, error: 'Save failed — try again' }));
      return false;
    }
  }, [getProfile]);

  // Metadata from the most recent successful GET — which device the save came
  // from, and when. A ref (not state) so it's readable synchronously right
  // after `await autoLoad()` resolves, without waiting on a re-render.
  const lastSyncMetaRef = useRef<{ lastSaved: string | null; savedFrom: string | null }>({ lastSaved: null, savedFrom: null });
  const getLastSyncMeta = useCallback(() => lastSyncMetaRef.current, []);

  // Load progress from cloud
  const loadFromCloud = useCallback(async (): Promise<GameProgress | null> => {
    const profile = getProfile();
    if (!profile) return null;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(`/api/cloud-save?player=${encodeURIComponent(profile.playerName)}&code=${encodeURIComponent(profile.secretCode)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        lastSyncMetaRef.current = { lastSaved: data.lastSaved ?? null, savedFrom: data.savedFrom ?? null };
        setState(prev => ({ ...prev, isLoading: false, lastSynced: data.lastSaved }));
        return data.progress;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, [getProfile]);

  // Auto-load once per session: called on mount by anything that wants the
  // freshest cloud copy without the player tapping "Load" themselves. Guarded
  // two ways — an in-memory ref (survives re-renders within this mount) and a
  // sessionStorage flag (survives a remount / route change within the tab) —
  // so a saved profile never triggers more than one silent fetch per session.
  const autoLoadedRef = useRef(false);

  const autoLoad = useCallback(async (): Promise<GameProgress | null> => {
    const profile = getProfile();
    if (!profile) return null;

    if (autoLoadedRef.current) return null;

    let alreadyRanThisSession = false;
    try {
      alreadyRanThisSession = sessionStorage.getItem(AUTOLOAD_FLAG_KEY) === 'true';
    } catch {
      // sessionStorage blocked (private mode, etc.) — the ref still guards this mount
    }

    autoLoadedRef.current = true;
    if (alreadyRanThisSession) return null;

    try {
      sessionStorage.setItem(AUTOLOAD_FLAG_KEY, 'true');
    } catch {
      // storage blocked — the ref above still prevents a second call this mount
    }

    return loadFromCloud();
  }, [getProfile, loadFromCloud]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(CLOUD_SAVE_KEY);
    setState({
      isLoggedIn: false,
      playerName: null,
      isSaving: false,
      isLoading: false,
      lastSynced: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    login,
    saveToCloud,
    loadFromCloud,
    autoLoad,
    getLastSyncMeta,
    logout,
  };
}
