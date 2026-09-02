import { useState } from 'react';
import { KeyRound, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { testAdminKey, KeyTestOutcome } from './adminApi';

interface AdminKeyBarProps {
  adminKey: string;
  onChange: (key: string) => void;
}

const CHIP: Record<KeyTestOutcome | 'untested', { label: string; className: string; icon: JSX.Element }> = {
  untested: { label: 'Not tested', className: 'bg-muted text-muted-foreground border-border', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  valid: { label: 'Key works', className: 'bg-primary/15 text-primary border-primary/40', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  invalid: { label: 'Wrong key', className: 'bg-destructive/15 text-destructive border-destructive/40', icon: <XCircle className="w-3.5 h-3.5" /> },
  'not-configured': { label: 'ADMIN_KEY not set on Netlify', className: 'bg-accent/15 text-accent border-accent/40', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  unknown: { label: 'Could not check', className: 'bg-muted text-muted-foreground border-border', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

export function AdminKeyBar({ adminKey, onChange }: AdminKeyBarProps) {
  const [testing, setTesting] = useState(false);
  const [outcome, setOutcome] = useState<KeyTestOutcome | 'untested'>('untested');
  const [message, setMessage] = useState<string>('');

  const handleTest = async () => {
    setTesting(true);
    const result = await testAdminKey(adminKey);
    setOutcome(result.outcome);
    setMessage(result.message);
    setTesting(false);
  };

  const chip = CHIP[outcome];

  return (
    <div className="admin-keybar">
      <div className="admin-keybar-field">
        <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <Input
          type="password"
          autoComplete="off"
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => { onChange(e.target.value); setOutcome('untested'); setMessage(''); }}
          className="admin-keybar-input"
          aria-label="Admin key"
        />
        <Button type="button" size="sm" variant="secondary" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test key'}
        </Button>
      </div>
      <div className={`admin-chip ${chip.className}`} title={message || undefined}>
        {chip.icon}
        <span>{message && outcome !== 'untested' ? message : chip.label}</span>
      </div>
    </div>
  );
}
