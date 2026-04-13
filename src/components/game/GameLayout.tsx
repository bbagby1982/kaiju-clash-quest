import { ReactNode } from 'react';
import { GameTab } from '@/types/game';
import { Sword, Trophy, BookOpen, Zap } from 'lucide-react';

interface GameLayoutProps {
  children: ReactNode;
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
}

const tabs: { id: GameTab; label: string; icon: typeof Sword }[] = [
  { id: 'battle', label: 'Battle', icon: Sword },
  { id: 'race', label: 'Race', icon: Trophy },
  { id: 'monsters', label: 'My Monsters', icon: Zap },
  { id: 'encyclopedia', label: 'Encyclopedia', icon: BookOpen },
];

export function GameLayout({ children, activeTab, onTabChange }: GameLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="relative py-4 px-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-atomic">
            <span className="text-2xl">🦎</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold tracking-wider">
            <span className="text-primary text-glow-atomic">KAIJU</span>
            <span className="text-muted-foreground mx-1">CLASH</span>
            <span className="text-primary text-glow-atomic">QUEST</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm safe-area-pb">
        <div className="flex justify-around items-center py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-primary scale-105'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg transition-all ${
                  isActive ? 'bg-primary/20 glow-atomic' : ''
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium font-rajdhani">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
