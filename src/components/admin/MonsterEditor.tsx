import { useMemo, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CustomMonsterInput, Monster } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoster } from '@/lib/roster';
import { MonsterSprite } from '@/components/game/MonsterSprite';
import { ArtEditor } from './ArtEditor';
import { MonsterForm } from './MonsterForm';
import { draftFromMonster } from './monsterDraft';
import { StatCardPreview } from './StatCardPreview';

interface MonsterEditorProps {
  id: string | null;
  adminKey: string;
  onBack: () => void;
  onSavedNew: (id: string) => void;
}

type EditorTab = 'art' | 'details';

export function MonsterEditor({ id, adminKey, onBack, onSavedNew }: MonsterEditorProps) {
  const roster = useRoster();
  const isNew = id === null;
  const existing = id ? roster.byId(id) : undefined;
  const isStaticOnly = !!existing && !existing.custom;

  const initialDraft = useMemo(() => draftFromMonster(existing), [existing]);
  const [draft, setDraft] = useState<CustomMonsterInput>(initialDraft);
  const [tab, setTab] = useState<EditorTab>(isNew ? 'details' : 'art');
  const handleDraftChange = useCallback((d: CustomMonsterInput) => setDraft(d), []);

  const previewMonster: Monster = useMemo(() => ({
    id: draft.id || id || 'preview',
    name: draft.name || 'New Monster',
    title: draft.title,
    era: draft.era,
    description: draft.description,
    stats: draft.stats,
    specialAbility: draft.specialAbility,
    terrainBonus: draft.terrainBonus,
    rarity: draft.rarity,
    imageColor: draft.imageColor,
    funFacts: draft.funFacts,
    strengths: draft.strengths,
    weaknesses: draft.weaknesses,
    facing: draft.facing,
    custom: existing?.custom ?? isNew,
  }), [draft, id, existing, isNew]);

  const hasArt = id ? roster.hasArt(id) : false;
  const currentImageUrl = id ? roster.imageUrl(id) : undefined;

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to gallery
        </Button>
        <h2 className="admin-editor-title">{isNew ? 'New Monster' : (draft.name || id)}</h2>
      </div>

      <div className="admin-editor-body">
        <div className="admin-editor-preview">
          <div className="admin-editor-sprite">
            <MonsterSprite monster={previewMonster} size="lg" state="idle" shadow={false} />
          </div>
          <StatCardPreview draft={draft} />
        </div>

        <div className="admin-editor-panel">
          <Tabs value={tab} onValueChange={(v) => setTab(v as EditorTab)}>
            <TabsList className="admin-tabs-list">
              <TabsTrigger value="art">Artwork</TabsTrigger>
              <TabsTrigger value="details">Monster Info</TabsTrigger>
            </TabsList>
            <TabsContent value="art">
              <ArtEditor
                monster={previewMonster}
                adminKey={adminKey}
                hasArt={hasArt}
                currentImageUrl={currentImageUrl}
                showFacingNote={isStaticOnly}
                disabled={isNew}
                onChanged={() => roster.refresh()}
              />
            </TabsContent>
            <TabsContent value="details">
              <MonsterForm
                initial={initialDraft}
                isNew={isNew}
                isStaticOnly={isStaticOnly}
                adminKey={adminKey}
                onDraftChange={handleDraftChange}
                onSaved={(m) => {
                  roster.refresh();
                  if (isNew) onSavedNew(m.id);
                  setTab('art');
                }}
                onDeleted={() => {
                  roster.refresh();
                  onBack();
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
