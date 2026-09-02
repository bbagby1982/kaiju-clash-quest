import { useState, KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems: number;
  maxLen: number;
  placeholder?: string;
}

export function StringListEditor({ label, items, onChange, maxItems, maxLen, placeholder }: StringListEditorProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim().slice(0, maxLen);
    if (!value || items.length >= maxItems) return;
    onChange([...items, value]);
    setDraft('');
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <div className="admin-field">
      <label className="admin-label">{label} <span className="admin-label-count">{items.length}/{maxItems}</span></label>
      <ul className="admin-string-list">
        {items.map((item, i) => (
          <li key={i} className="admin-string-item">
            <span>{item}</span>
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${item}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {items.length < maxItems && (
        <div className="admin-string-add">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLen}
          />
          <Button type="button" size="sm" variant="secondary" onClick={add} disabled={!draft.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
