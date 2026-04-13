import { Zap } from 'lucide-react';

interface BattleReadyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function BattleReadyButton({ onClick, disabled, label = "Battle Ready" }: BattleReadyButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`battle-ready-btn flex items-center gap-3 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <Zap className="w-6 h-6" />
      <span>{label}</span>
      <Zap className="w-6 h-6" />
    </button>
  );
}
