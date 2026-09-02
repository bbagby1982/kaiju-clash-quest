import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { GameProgress } from '@/types/game';
import { useCloudSave } from '@/hooks/useCloudSave';

const LOCAL_PROGRESS_KEY = 'godzilla-vs-progress';

interface CloudSavePanelProps {
  isLoggedIn: boolean;
  playerName: string | null;
  isSaving: boolean;
  isLoading: boolean;
  lastSynced: string | null;
  error: string | null;
  onLogin: (name: string, code: string) => Promise<{ success: boolean; progress?: GameProgress; isNew?: boolean; error?: string }>;
  onSave: () => void;
  onLoad: () => void;
  onLogout: () => void;
  onCloudProgressLoaded: (progress: GameProgress) => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return 'unknown';
  }
}

function readLocalProgress(): GameProgress | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameProgress;
  } catch {
    return null;
  }
}

/**
 * Cloud counts as "ahead" of whatever is on this device when it has strictly
 * more battles+races played, or ties on that and has strictly more unlocked
 * monsters. A tie on both — or no local save at all — favors the cloud only
 * when there's nothing local to protect.
 */
function isCloudAhead(cloud: GameProgress, local: GameProgress | null): boolean {
  if (!local) return true;
  const cloudTotal = (cloud.totalBattles ?? 0) + (cloud.totalRaces ?? 0);
  const localTotal = (local.totalBattles ?? 0) + (local.totalRaces ?? 0);
  if (cloudTotal !== localTotal) return cloudTotal > localTotal;
  return (cloud.unlockedMonsters?.length ?? 0) > (local.unlockedMonsters?.length ?? 0);
}

export function CloudSavePanel({
  isLoggedIn,
  playerName,
  isSaving,
  isLoading,
  lastSynced,
  error,
  onLogin,
  onSave,
  onLoad,
  onLogout,
  onCloudProgressLoaded,
}: CloudSavePanelProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  // A second, panel-owned useCloudSave instance whose only job is the silent
  // once-per-session auto-load. Index.tsx's own instance still drives every
  // prop above (isLoggedIn, playerName, etc.) — this one exists purely for
  // its session-guarded autoLoad() and the sync metadata it captures.
  const { autoLoad, getLastSyncMeta } = useCloudSave();
  const autoLoadStarted = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || autoLoadStarted.current) return;
    autoLoadStarted.current = true;

    (async () => {
      const cloudProgress = await autoLoad();
      if (!cloudProgress) return;
      if (!isCloudAhead(cloudProgress, readLocalProgress())) return;

      onCloudProgressLoaded(cloudProgress);

      const meta = getLastSyncMeta();
      const bits: string[] = [];
      if (meta.savedFrom && meta.savedFrom !== 'unknown') bits.push(`saved from ${meta.savedFrom}`);
      if (meta.lastSaved) bits.push(formatTime(meta.lastSaved));
      setRestoredNotice(`Restored from cloud${bits.length ? ` (${bits.join(', ')})` : ''}`);
      setTimeout(() => setRestoredNotice(null), 8000);
    })();
  }, [isLoggedIn, autoLoad, getLastSyncMeta, onCloudProgressLoaded]);

  const handleLogin = async () => {
    if (!name.trim() || !code.trim()) {
      setLoginError('Enter both a name and secret code!');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    const result = await onLogin(name.trim(), code.trim());
    setLoginLoading(false);
    if (result.success) {
      setShowLogin(false);
      setName('');
      setCode('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setLoginError(result.error || 'Something went wrong');
    }
  };

  // Logged in view
  if (isLoggedIn) {
    return (
      <div className="rounded-2xl bg-card/90 border-2 border-primary/30 shadow-sm overflow-hidden">
        {restoredNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-atomic/15 border-b border-atomic/30 text-[11px] text-atomic font-medium">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">{restoredNotice}</span>
          </div>
        )}

        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-primary" />
              </div>
              <span className="font-orbitron text-xs text-primary font-bold tracking-wide">CLOUD SAVE</span>
              {showSuccess && <Check className="w-4 h-4 text-atomic animate-pulse" />}
            </div>
            <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Log out">
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-semibold truncate">👤 {playerName}</p>
              <p className="text-[11px] text-muted-foreground">
                {lastSynced ? `Synced ${formatTime(lastSynced)}` : 'Not synced yet'}
              </p>
            </div>

            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-transform"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={onLoad}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Load
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login form
  if (showLogin) {
    return (
      <div className="p-4 rounded-2xl bg-card/90 border-2 border-primary/30 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-orbitron text-sm text-primary font-bold tracking-wide">CLOUD SAVE</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">
          Play on iPad, phone, AND laptop! Pick a name and a secret code you'll remember.
        </p>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Your player name (e.g. Alfred)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-muted border-2 border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Secret code (e.g. godzilla123)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={30}
            className="w-full px-4 py-3 rounded-xl bg-muted border-2 border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {loginError && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowLogin(false)}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="flex-1 py-3 rounded-xl text-sm font-orbitron font-bold bg-primary text-primary-foreground hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 transition-transform flex items-center justify-center gap-1.5"
          >
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {loginLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    );
  }

  // Not logged in — big friendly connect button
  return (
    <button
      onClick={() => setShowLogin(true)}
      className="w-full p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/70 hover:from-primary/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
    >
      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <CloudOff className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm text-foreground font-semibold">
        Tap to enable Cloud Save — play on all devices!
      </span>
    </button>
  );
}
