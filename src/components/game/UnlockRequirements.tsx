import { Monster, GameProgress, UnlockRequirement } from '@/types/game';
import { Check, Lock, Trophy, Zap, MapPin, Star, Target, Crown, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UnlockRequirementsProps {
  monster: Monster;
  progress: GameProgress;
}

export function UnlockRequirements({ monster, progress }: UnlockRequirementsProps) {
  if (!monster.unlockRequirements) return null;

  const getRequirementProgress = (req: UnlockRequirement): { current: number; target: number; completed: boolean } => {
    let current = 0;
    
    switch (req.type) {
      case 'battles_won':
        current = progress.wins;
        break;
      case 'races_won':
        current = progress.racesWon;
        break;
      case 'defeat_monster':
        current = progress.defeatedMonsters.includes(req.monsterId || '') ? 1 : 0;
        break;
      case 'trait_wins':
        current = progress.traitWins[req.trait || ''] || 0;
        break;
      case 'terrain_wins':
        current = progress.terrainWins[req.terrain || ''] || 0;
        break;
      case 'player_level':
        current = progress.playerLevel;
        break;
      case 'no_booster_wins':
        current = progress.noBoosterWins;
        break;
      case 'monster_mastery':
        const mastery = progress.monsterMastery[req.monsterId || ''];
        current = mastery?.isMastered ? 1 : 0;
        break;
      case 'theme_gate':
        current = progress.unlockedThemes.includes(req.theme || '') ? 1 : 0;
        break;
      case 'special_trial':
        current = progress.completedTrials.includes(req.trialId || '') ? 1 : 0;
        break;
      case 'unique_monsters_used':
        current = progress.uniqueMonstersUsed.length;
        break;
      case 'consecutive_wins':
        current = progress.consecutiveWins;
        break;
      case 'discovery':
        current = progress.discoveryProgress[req.discoveryType || ''] || 0;
        break;
      default:
        current = 0;
    }

    return {
      current,
      target: req.target,
      completed: current >= req.target,
    };
  };

  const getRequirementIcon = (req: UnlockRequirement) => {
    switch (req.type) {
      case 'battles_won':
      case 'consecutive_wins':
        return <Trophy className="w-3 h-3" />;
      case 'races_won':
        return <Zap className="w-3 h-3" />;
      case 'terrain_wins':
        return <MapPin className="w-3 h-3" />;
      case 'player_level':
        return <Star className="w-3 h-3" />;
      case 'monster_mastery':
        return <Crown className="w-3 h-3" />;
      case 'theme_gate':
        return <Sparkles className="w-3 h-3" />;
      case 'special_trial':
        return <Target className="w-3 h-3" />;
      default:
        return <Target className="w-3 h-3" />;
    }
  };

  const completedCount = monster.unlockRequirements.filter(
    req => getRequirementProgress(req).completed
  ).length;
  const totalCount = monster.unlockRequirements.length;
  const overallProgress = (completedCount / totalCount) * 100;

  // Determine difficulty tier based on number and type of requirements
  const getDifficultyTier = () => {
    const reqCount = monster.unlockRequirements?.length || 0;
    const hasAdvancedReqs = monster.unlockRequirements?.some(
      r => ['monster_mastery', 'theme_gate', 'special_trial', 'discovery'].includes(r.type)
    );
    
    if (reqCount >= 4 || hasAdvancedReqs) return { label: 'LEGENDARY CHALLENGE', color: 'text-lightning' };
    if (reqCount >= 3) return { label: 'HARD', color: 'text-monster-red' };
    if (reqCount >= 2) return { label: 'MEDIUM', color: 'text-electric' };
    return { label: 'EASY', color: 'text-atomic' };
  };

  const difficulty = getDifficultyTier();

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h4 className="font-orbitron font-bold text-sm text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          Unlock Requirements
        </h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${difficulty.color}`}>{difficulty.label}</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      <Progress value={overallProgress} className="h-2" />

      <div className="space-y-2">
        {monster.unlockRequirements.map((req, i) => {
          const { current, target, completed } = getRequirementProgress(req);
          const progressPercent = Math.min((current / target) * 100, 100);

          return (
            <div 
              key={i} 
              className={`flex items-center gap-2 p-2 rounded-md transition-all ${
                completed 
                  ? 'bg-primary/20 border border-primary/30' 
                  : 'bg-muted/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                completed ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'
              }`}>
                {completed ? (
                  <Check className="w-3 h-3" />
                ) : (
                  getRequirementIcon(req)
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${completed ? 'text-primary' : 'text-foreground'}`}>
                  {req.description}
                </p>
                {!completed && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {current}/{target}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint for discovery unlocks */}
      {monster.unlockRequirements.some(r => r.type === 'discovery') && (
        <p className="text-xs text-muted-foreground italic mt-2">
          💡 Some requirements reward creative or unusual play styles...
        </p>
      )}
    </div>
  );
}
