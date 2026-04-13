import { useState, useCallback, useEffect } from 'react';
import { GameProgress } from '@/types/game';

const CLOUD_SAVE_KEY = 'kaiju-cloud-save-profile';

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
    } catch (error: any) {
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

  // Load progress from cloud
  const loadFromCloud = useCallback(async (): Promise<GameProgress | null> => {
    const profile = getProfile();
    if (!profile) return null;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(`/api/cloud-save?player=${encodeURIComponent(profile.playerName)}&code=${encodeURIComponent(profile.secretCode)}`);
      const data = await res.json();

      if (res.ok && data.success) {
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
    logout,
  };
}
