import { Zap } from 'lucide-react';

interface BattleReadyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function BattleReadyButton({ onClick, disabled, label = "Battle Ready" }: BattleReadyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`battle-ready-btn kq-tap flex items-center justify-center gap-3 w-full max-w-sm text-xl tracking-widest ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'animate-pulse-scale'
      }`}
    >
      <Zap className="w-6 h-6 fill-current shrink-0" />
      <span className="truncate">{label}</span>
      <Zap className="w-6 h-6 fill-current shrink-0" />
    </button>
  );
}
