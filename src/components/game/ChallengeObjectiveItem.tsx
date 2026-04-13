import { ChallengeObjective } from '@/types/game';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChallengeObjectiveItemProps {
  objective: ChallengeObjective;
}

export function ChallengeObjectiveItem({ objective }: ChallengeObjectiveItemProps) {
  const isComplete = objective.current >= objective.target;
  const progressPercent = Math.min((objective.current / objective.target) * 100, 100);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-all",
      isComplete ? "bg-primary/10" : "bg-muted/50"
    )}>
      {/* Checkbox indicator */}
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
        isComplete 
          ? "bg-primary border-primary text-primary-foreground" 
          : "border-muted-foreground/50"
      )}>
        {isComplete && <Check className="w-3 h-3" />}
      </div>
      
      {/* Objective info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm transition-all",
          isComplete ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {objective.description}
        </p>
        
        {!isComplete && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">
              {objective.current}/{objective.target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
