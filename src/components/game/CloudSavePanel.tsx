import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import { GameProgress } from '@/types/game';

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
}: CloudSavePanelProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const formatTime = (iso: string) => {
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
  };

  // Logged in view
  if (isLoggedIn) {
    return (
      <div className="p-3 rounded-xl bg-card/80 border border-primary/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-orbitron text-xs text-primary font-bold">CLOUD SAVE</span>
            {showSuccess && <Check className="w-4 h-4 text-green-400 animate-pulse" />}
          </div>
          <button onClick={onLogout} className="p-1 rounded hover:bg-muted transition-colors" title="Log out">
            <LogOut className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium truncate">👤 {playerName}</p>
            <p className="text-[10px] text-muted-foreground">
              {lastSynced ? `Synced ${formatTime(lastSynced)}` : 'Not synced yet'}
            </p>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={onLoad}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Load
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Login form
  if (showLogin) {
    return (
      <div className="p-4 rounded-xl bg-card/80 border border-primary/30 space-y-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-primary" />
          <h3 className="font-orbitron text-sm text-primary font-bold">CLOUD SAVE</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Play on iPad, phone, AND laptop! Pick a name and a secret code you'll remember.
        </p>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Your player name (e.g. Alfred)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Secret code (e.g. godzilla123)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={30}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {loginError && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>{loginError}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowLogin(false)}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-muted text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="flex-1 py-2 rounded-lg text-sm font-orbitron font-bold bg-primary text-primary-foreground hover:scale-[1.02] transition-transform flex items-center justify-center gap-1"
          >
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {loginLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    );
  }

  // Not logged in — show connect button
  return (
    <button
      onClick={() => setShowLogin(true)}
      className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 bg-card/30 hover:border-primary/60 hover:bg-card/50 transition-all flex items-center justify-center gap-2"
    >
      <CloudOff className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        Tap to enable Cloud Save — play on all devices!
      </span>
    </button>
  );
}
