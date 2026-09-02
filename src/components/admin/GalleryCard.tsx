import { ImageOff, Cloud, Package, Sparkles } from 'lucide-react';
import { Monster } from '@/types/game';
import { Badge } from '@/components/ui/badge';

interface GalleryCardProps {
  monster: Monster;
  imageUrl: string | undefined;
  artSource: 'bundled' | 'cloud' | 'none';
  onClick: () => void;
}

const RARITY_CLASS: Record<Monster['rarity'], string> = {
  common: 'admin-rarity-common',
  rare: 'admin-rarity-rare',
  legendary: 'admin-rarity-legendary',
};

export function GalleryCard({ monster, imageUrl, artSource, onClick }: GalleryCardProps) {
  return (
    <button type="button" className="admin-gallery-card" onClick={onClick}>
      <div className="admin-gallery-thumb">
        {imageUrl ? (
          <img src={imageUrl} alt={monster.name} loading="lazy" />
        ) : (
          <div className="admin-gallery-thumb-empty">
            <ImageOff className="w-7 h-7" aria-hidden="true" />
            <span>no art yet</span>
          </div>
        )}
      </div>
      <div className="admin-gallery-info">
        <p className="admin-gallery-name">{monster.name}</p>
        <p className="admin-gallery-id">{monster.id}</p>
        <div className="admin-gallery-chips">
          <Badge variant="outline" className={RARITY_CLASS[monster.rarity]}>{monster.rarity}</Badge>
          {artSource === 'bundled' && <Badge variant="secondary"><Package className="w-3 h-3 mr-1" />bundled art</Badge>}
          {artSource === 'cloud' && <Badge variant="secondary"><Cloud className="w-3 h-3 mr-1" />cloud art</Badge>}
          {monster.custom && <Badge variant="outline" className="admin-chip-custom"><Sparkles className="w-3 h-3 mr-1" />custom</Badge>}
        </div>
      </div>
    </button>
  );
}
