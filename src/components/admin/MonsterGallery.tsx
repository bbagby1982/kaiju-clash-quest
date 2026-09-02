import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Monster } from '@/types/game';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getBundledMonsterImage } from '@/lib/monsterImages';
import { useRoster } from '@/lib/roster';
import { GalleryCard } from './GalleryCard';

type FilterKey = 'all' | 'has-art' | 'needs-art' | 'custom';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs-art', label: 'Needs art' },
  { key: 'has-art', label: 'Has art' },
  { key: 'custom', label: 'Custom' },
];

interface MonsterGalleryProps {
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function MonsterGallery({ onSelect, onCreateNew }: MonsterGalleryProps) {
  const roster = useRoster();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return roster.all.map((monster) => {
      const bundled = !!getBundledMonsterImage(monster.id);
      const hasArt = bundled || roster.hasArt(monster.id);
      const artSource: 'bundled' | 'cloud' | 'none' = bundled ? 'bundled' : hasArt ? 'cloud' : 'none';
      return { monster, hasArt, artSource };
    });
  }, [roster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(({ monster, hasArt }) => {
        if (filter === 'has-art' && !hasArt) return false;
        if (filter === 'needs-art' && hasArt) return false;
        if (filter === 'custom' && !monster.custom) return false;
        if (q && !monster.name.toLowerCase().includes(q) && !monster.id.toLowerCase().includes(q)) return false;
        return true;
      })
      // needs-art first by default, then alphabetical
      .sort((a, b) => {
        if (a.hasArt !== b.hasArt) return a.hasArt ? 1 : -1;
        return a.monster.name.localeCompare(b.monster.name);
      });
  }, [rows, filter, search]);

  return (
    <div className="admin-gallery">
      <div className="admin-gallery-toolbar">
        <div className="admin-search">
          <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or id..."
            aria-label="Search monsters"
          />
        </div>
        <div className="admin-filter-row" role="tablist" aria-label="Filter monsters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`admin-filter-pill ${filter === f.key ? 'admin-filter-pill--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button type="button" onClick={onCreateNew} className="admin-create-btn">
          <Plus className="w-4 h-4" /> New monster
        </Button>
      </div>

      <p className="admin-gallery-count">
        {filtered.length} of {rows.length} monster{rows.length === 1 ? '' : 's'}
      </p>

      {filtered.length === 0 ? (
        <div className="admin-empty-state">No monsters match that filter.</div>
      ) : (
        <div className="admin-gallery-grid">
          {filtered.map(({ monster, artSource }) => (
            <GalleryCard
              key={monster.id}
              monster={monster}
              imageUrl={roster.imageUrl(monster.id)}
              artSource={artSource}
              onClick={() => onSelect(monster.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
