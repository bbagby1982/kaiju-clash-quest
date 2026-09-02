import { ReactNode } from 'react';
import { GameTab } from '@/types/game';
import { Home, Swords, Flag, Dna, BookOpen, LucideIcon } from 'lucide-react';
import '@/styles/home.css';

interface GameLayoutProps {
  children: ReactNode;
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
}

const tabs: { id: GameTab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'battle', label: 'Battle', icon: Swords },
  { id: 'race', label: 'Race', icon: Flag },
  { id: 'monsters', label: 'Monsters', icon: Dna },
  { id: 'encyclopedia', label: 'Encyclopedia', icon: BookOpen },
];

export function GameLayout({ children, activeTab, onTabChange }: GameLayoutProps) {
  // The Home tab has its own big logo/byline in the title stage right below —
  // showing the full wordmark here too reads as a duplicated header, so Home
  // collapses this bar down to just the mark. Every other tab keeps it.
  const isHome = activeTab === 'home';

  return (
    <div className="min-h-screen flex flex-col bg-background kq-no-x">
      {/* Header — slim: mark, wordmark, byline (collapsed to just the mark on Home) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md kq-safe-top">
        <div className="flex items-center gap-2.5 px-4 py-2">
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center glow-atomic shrink-0">
            <span className="text-xl leading-none" aria-hidden="true">🦎</span>
          </div>
          {!isHome && (
            <div className="min-w-0">
              <h1 className="font-orbitron font-black tracking-wider text-base sm:text-lg leading-none truncate">
                <span className="text-primary text-glow-atomic">KAIJU</span>
                <span className="text-foreground/70 mx-1">CLASH</span>
                <span className="text-primary text-glow-atomic">QUEST</span>
              </h1>
              <p className="text-[0.6rem] tracking-[0.3em] uppercase text-lightning/80 leading-none mt-1">
                by Alfred
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main content — re-keyed per tab so every switch replays the entrance */}
      <main key={activeTab} className="flex-1 animate-fade-in kq-no-x">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="flex items-stretch gap-0.5 px-1 py-1 max-w-3xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className="kq-nav-item kq-tap"
                data-active={isActive ? 'true' : 'false'}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
              >
                <span className="kq-nav-icon">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="kq-nav-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
