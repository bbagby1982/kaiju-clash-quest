import { useState, useEffect } from 'react';
import { DailyChallenge, DailyChallengeProgress } from '@/types/game';
import { getTimeUntilReset } from '@/lib/dailyChallengeGenerator';
import { ChallengeObjectiveItem } from './ChallengeObjectiveItem';
import { Clock, Flame, Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyChallengeCardProps {
  challengeProgress: DailyChallengeProgress | null;
  onRefresh: () => void;
}

export function DailyChallengeCard({ challengeProgress, onRefresh }: DailyChallengeCardProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilReset());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Refresh challenge if needed on mount
    onRefresh();
  }, [onRefresh]);
  
  const challenge = challengeProgress?.currentChallenge;
  const isCompleted = challengeProgress?.todayCompleted || false;
  const streak = challengeProgress?.challengeStreak || 0;
  
  if (!challenge) {
    return (
      <div className="bg-card/50 border border-border rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }
  
  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-red-400 bg-red-500/20',
  };
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border transition-all duration-300",
      isCompleted 
        ? "bg-gradient-to-br from-primary/20 to-electric/20 border-primary/50" 
        : "bg-card/80 border-border hover:border-primary/30"
    )}>
      {/* Completed overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
      )}
      
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{challenge.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-orbitron font-bold text-foreground">
                  {challenge.title}
                </h3>
                {isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-primary animate-scale-in" />
                )}
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                difficultyColors[challenge.difficulty]
              )}>
                {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
              </span>
            </div>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeLeft.hours}h {timeLeft.minutes}m</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">{challenge.description}</p>
      </div>
      
      {/* Objectives */}
      <div className="px-4 pb-2 space-y-2">
        {challenge.objectives.map(objective => (
          <ChallengeObjectiveItem key={objective.id} objective={objective} />
        ))}
      </div>
      
      {/* Footer - Rewards & Streak */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between">
        {/* Rewards */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lightning" />
          <span className="text-xs text-muted-foreground">
            {challenge.rewards.map(r => r.description).join(', ')}
          </span>
        </div>
        
        {/* Streak */}
        {streak > 0 && (
          <div className="flex items-center gap-1">
            <Flame className={cn(
              "w-4 h-4",
              streak >= 7 ? "text-orange-500" : streak >= 3 ? "text-yellow-500" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs font-bold",
              streak >= 7 ? "text-orange-500" : streak >= 3 ? "text-yellow-500" : "text-muted-foreground"
            )}>
              {streak} day{streak > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Complete!
          </div>
        </div>
      )}
    </div>
  );
}
