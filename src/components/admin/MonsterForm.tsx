import { useEffect, useState } from 'react';
import { Trash2, Loader2, Save, Info } from 'lucide-react';
import { CustomMonsterInput, Monster } from '@/types/game';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { StringListEditor } from './StringListEditor';
import { hexToHslString } from './imagePipeline';
import { saveCustomMonster, deleteCustomMonster } from './adminApi';
import { BLANK_MONSTER_DRAFT } from './monsterDraft';

const ABILITY_TYPES = ['beam', 'melee', 'area', 'buff', 'projectile', 'debuff', 'drain', 'movement', 'trap', 'energy'] as const;
const RARITIES = ['common', 'rare', 'legendary'] as const;
const TERRAINS = ['city', 'island', 'ocean', 'volcano', 'ruins', 'storm', 'space', 'sky', 'jungle', 'arctic', 'desert'] as const;

const BLANK = BLANK_MONSTER_DRAFT;

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,60}$/;

interface MonsterFormProps {
  initial: CustomMonsterInput;
  isNew: boolean;
  isStaticOnly: boolean;
  adminKey: string;
  onSaved: (monster: Monster) => void;
  onDeleted: () => void;
  onDraftChange: (draft: CustomMonsterInput) => void;
}

export function MonsterForm({ initial, isNew, isStaticOnly, adminKey, onSaved, onDeleted, onDraftChange }: MonsterFormProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<CustomMonsterInput>(initial.id ? initial : BLANK);
  const [idTouched, setIdTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDraft(initial.id ? initial : BLANK);
    setIdTouched(!isNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  useEffect(() => { onDraftChange(draft); }, [draft, onDraftChange]);

  const update = <K extends keyof CustomMonsterInput>(key: K, value: CustomMonsterInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    setDraft((d) => ({ ...d, name, id: idTouched ? d.id : slugify(name) }));
  };

  const toggleTerrain = (t: string, checked: boolean) => {
    const current = draft.terrainBonus || [];
    update('terrainBonus', checked ? [...current, t] : current.filter((x) => x !== t));
  };

  const idValid = ID_PATTERN.test(draft.id);
  const nameValid = draft.name.trim().length >= 2 && draft.name.trim().length <= 40;
  const canSave = idValid && nameValid && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const res = await saveCustomMonster(adminKey, { ...draft, id: draft.id.toLowerCase() });
    setSaving(false);
    if (res.ok && res.monster) {
      toast({ title: 'Monster saved', description: `${res.monster.name as string} is live in the game roster.` });
      onSaved(res.monster);
    } else {
      toast({ variant: 'destructive', title: 'Save failed', description: res.message });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteCustomMonster(adminKey, draft.id);
    setDeleting(false);
    if (res.ok) {
      toast({ title: 'Custom monster deleted', description: isStaticOnly ? `${draft.name} reverted to its built-in definition.` : `${draft.name} is gone from the roster.` });
      onDeleted();
    } else {
      toast({ variant: 'destructive', title: 'Delete failed', description: res.message });
    }
  };

  return (
    <div className="admin-form">
      {isStaticOnly && (
        <div className="admin-note">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>This is one of Alfred&rsquo;s bundled monsters. Saving here creates a <strong>custom override</strong> with the same id — it takes precedence over the built-in definition everywhere in the game.</span>
        </div>
      )}

      <div className="admin-form-grid">
        <div className="admin-field">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" value={draft.name} onChange={(e) => handleNameChange(e.target.value)} maxLength={40} placeholder="Lava Rex" />
        </div>
        <div className="admin-field">
          <Label htmlFor="m-id">
            Id
            {!isNew && <span className="admin-label-count"> (locked)</span>}
          </Label>
          <Input
            id="m-id"
            value={draft.id}
            disabled={!isNew}
            onChange={(e) => { setIdTouched(true); update('id', slugify(e.target.value)); }}
            placeholder="lava-rex"
          />
          {isNew && !idValid && draft.id && <p className="admin-error-text">letters, digits and dashes only</p>}
        </div>
        <div className="admin-field">
          <Label htmlFor="m-title">Title</Label>
          <Input id="m-title" value={draft.title} onChange={(e) => update('title', e.target.value)} maxLength={60} placeholder="Terror of the Caldera" />
        </div>
        <div className="admin-field">
          <Label htmlFor="m-era">Era</Label>
          <Input id="m-era" value={draft.era} onChange={(e) => update('era', e.target.value)} maxLength={60} placeholder="Alfred's Lab" />
        </div>
      </div>

      <div className="admin-field">
        <Label htmlFor="m-desc">Description <span className="admin-label-count">{draft.description.length}/600</span></Label>
        <Textarea id="m-desc" value={draft.description} onChange={(e) => update('description', e.target.value.slice(0, 600))} rows={3} />
      </div>

      <div className="admin-field">
        <Label>Stats</Label>
        <div className="admin-stats-grid">
          {(['speed', 'strength', 'defense', 'specialAttack'] as const).map((stat) => (
            <div key={stat} className="admin-stat-row">
              <span className="admin-stat-label">{stat === 'specialAttack' ? 'Special Attack' : stat}</span>
              <Slider
                min={1} max={100} step={1}
                value={[draft.stats[stat]]}
                onValueChange={([v]) => update('stats', { ...draft.stats, [stat]: v })}
              />
              <span className="admin-stat-value">{draft.stats[stat]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="admin-field">
          <Label htmlFor="m-ability-name">Special ability name</Label>
          <Input id="m-ability-name" value={draft.specialAbility.name} onChange={(e) => update('specialAbility', { ...draft.specialAbility, name: e.target.value })} maxLength={40} placeholder="Magma Burst" />
        </div>
        <div className="admin-field">
          <Label htmlFor="m-ability-type">Ability type</Label>
          <Select value={draft.specialAbility.type} onValueChange={(v) => update('specialAbility', { ...draft.specialAbility, type: v as Monster['specialAbility']['type'] })}>
            <SelectTrigger id="m-ability-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ABILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="admin-field">
        <Label htmlFor="m-ability-desc">Ability description</Label>
        <Textarea id="m-ability-desc" value={draft.specialAbility.description} onChange={(e) => update('specialAbility', { ...draft.specialAbility, description: e.target.value.slice(0, 200) })} rows={2} />
      </div>

      <div className="admin-field">
        <Label>Terrain bonus</Label>
        <div className="admin-checkbox-grid">
          {TERRAINS.map((t) => (
            <label key={t} className="admin-checkbox-item">
              <Checkbox checked={(draft.terrainBonus || []).includes(t)} onCheckedChange={(c) => toggleTerrain(t, c === true)} />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="admin-field">
          <Label>Rarity</Label>
          <RadioGroup value={draft.rarity} onValueChange={(v) => update('rarity', v as Monster['rarity'])} className="admin-radio-row">
            {RARITIES.map((r) => (
              <label key={r} className="admin-radio-item">
                <RadioGroupItem value={r} />
                <span>{r}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
        <div className="admin-field">
          <Label htmlFor="m-color">Colour</Label>
          <div className="admin-color-row">
            <span className="admin-color-swatch" style={{ background: draft.imageColor }} aria-hidden="true" />
            <Input id="m-color" value={draft.imageColor} onChange={(e) => update('imageColor', e.target.value)} placeholder="hsl(120 40% 25%)" />
            <input
              type="color"
              className="admin-color-picker"
              aria-label="Pick a colour"
              onChange={(e) => update('imageColor', hexToHslString(e.target.value))}
            />
          </div>
        </div>
      </div>

      <label className="admin-toggle-row">
        <Switch checked={draft.facing === 'left'} onCheckedChange={(c) => update('facing', c ? 'left' : 'right')} />
        <span>This art faces ← left (default is facing right)</span>
      </label>

      <StringListEditor label="Fun facts" items={draft.funFacts || []} onChange={(v) => update('funFacts', v)} maxItems={6} maxLen={140} placeholder="Once ate a whole volcano" />
      <StringListEditor label="Strengths" items={draft.strengths || []} onChange={(v) => update('strengths', v)} maxItems={5} maxLen={80} placeholder="Immune to lava" />
      <StringListEditor label="Weaknesses" items={draft.weaknesses || []} onChange={(v) => update('weaknesses', v)} maxItems={5} maxLen={80} placeholder="Afraid of ice" />

      <div className="admin-form-actions">
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isNew ? 'Create monster' : 'Save changes'}
        </Button>
        {!isNew && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {draft.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isStaticOnly
                    ? 'This removes the custom override. The bundled version of this monster comes back — its artwork stays until removed separately.'
                    : 'This permanently removes the custom monster from the roster. Its artwork stays in storage until removed separately in the Artwork tab.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
