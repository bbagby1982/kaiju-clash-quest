import { useEffect, useState } from 'react';
import { DailyChallenge } from '@/types/game';
import { Trophy, Sparkles, Flame, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChallengeCompletedModalProps {
  challenge: DailyChallenge;
  streak: number;
  onClose: () => void;
}

export function ChallengeCompletedModal({ challenge, streak, onClose }: ChallengeCompletedModalProps) {
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  const streakMessages = [
    { min: 30, message: "🏆 LEGENDARY STREAK!", color: "text-purple-400" },
    { min: 14, message: "🔥 INCREDIBLE!", color: "text-orange-400" },
    { min: 7, message: "⚡ ON FIRE!", color: "text-yellow-400" },
    { min: 3, message: "💪 GREAT WORK!", color: "text-green-400" },
    { min: 0, message: "🎉 WELL DONE!", color: "text-primary" },
  ];
  
  const streakMessage = streakMessages.find(s => streak >= s.min) || streakMessages[streakMessages.length - 1];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className={cn(
        "relative kq-panel border-2 border-primary/60 rounded-2xl p-6 max-w-md w-full my-auto shadow-2xl glow-atomic",
        "transform transition-all duration-500",
        showContent ? "scale-100 opacity-100" : "scale-90 opacity-0"
      )}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="kq-tap absolute top-2 right-2 p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Trophy animation */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <Trophy className="w-20 h-20 text-lightning animate-bounce" />
            <div className="absolute -inset-4 bg-lightning/20 rounded-full blur-xl animate-pulse" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-orbitron font-bold text-center text-foreground mb-2">
          Challenge Complete!
        </h2>
        
        {/* Challenge info */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{challenge.icon}</span>
            <span className="font-semibold text-foreground">{challenge.title}</span>
          </div>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>
        
        {/* Rewards */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-lightning" />
            <span className="font-semibold text-foreground">Rewards Earned</span>
          </div>
          <div className="space-y-2">
            {challenge.rewards.map((reward, i) => (
              <div key={i} className="flex items-center justify-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span className="text-foreground">{reward.description}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Streak */}
        {streak > 0 && (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className={cn("font-orbitron font-bold", streakMessage.color)}>
                {streak} Day Streak!
              </span>
            </div>
            <p className={cn("text-sm font-medium", streakMessage.color)}>
              {streakMessage.message}
            </p>
          </div>
        )}
        
        {/* Continue button */}
        <Button 
          onClick={onClose}
          className="kq-tap w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-orbitron font-bold text-base"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
