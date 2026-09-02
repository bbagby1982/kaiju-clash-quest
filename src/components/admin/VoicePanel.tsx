/**
 * VoicePanel — admin "Voice Test" bench for the game's ElevenLabs cast.
 *
 * Lets whoever's setting up the game sanity-check every voice role and a monster
 * roar straight from the browser (through src/lib/voice.ts, the exact same code
 * path the arena uses), and shows the live /api/voice manifest — which voice id
 * each role currently resolves to, and whether ELEVENLABS_KEY is configured on
 * this Netlify site — so a "no sound in the game" report is quick to diagnose
 * without opening the Netlify dashboard.
 *
 * No admin key needed: /api/voice has no auth of its own (see netlify/functions/voice.mts).
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MONSTERS } from '@/data/monsters';
import { roar, speak, VoiceRole } from '@/lib/voice';

const ROLES: VoiceRole[] = ['narrator', 'godzilla', 'godzilla2', 'announcer', 'gamer', 'theatre'];

const ROLE_HINT: Record<VoiceRole, string> = {
  narrator: 'Battle captions (intro + each round)',
  godzilla: "Player's monster — victory quote",
  godzilla2: "Opponent's monster — victory quote",
  announcer: '"FIGHT!" / "ROUND N" / "K.O.!" stamps',
  gamer: 'Available for future commentary',
  theatre: 'Available for future flavour lines',
};

const ENV_VARS = [
  'ELEVENLABS_VOICE_GODZILLA',
  'ELEVENLABS_VOICE_GODZILLA2',
  'ELEVENLABS_VOICE_NARRATOR',
  'ELEVENLABS_VOICE_ANNOUNCER',
  'ELEVENLABS_VOICE_GAMER',
  'ELEVENLABS_VOICE_THEATRE',
  'ELEVENLABS_VOICE_FALLBACK',
];

interface VoiceManifest {
  voices: Record<string, string>;
  configured: boolean;
}

type SlotState = 'idle' | 'loading' | 'error';

export function VoicePanel() {
  const [text, setText] = useState('I am the King of the Monsters!');
  const [manifest, setManifest] = useState<VoiceManifest | null>(null);
  const [manifestError, setManifestError] = useState('');
  const [manifestLoading, setManifestLoading] = useState(false);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [roarMonsterId, setRoarMonsterId] = useState(MONSTERS[0]?.id ?? '');

  const loadManifest = useCallback(async () => {
    setManifestLoading(true);
    setManifestError('');
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'voices' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VoiceManifest;
      setManifest(data);
    } catch (err) {
      setManifestError(err instanceof Error ? err.message : 'Could not load the voice manifest');
    } finally {
      setManifestLoading(false);
    }
  }, []);

  useEffect(() => { void loadManifest(); }, [loadManifest]);

  const runSlot = useCallback((key: string, fn: () => Promise<void>) => {
    setSlots((s) => ({ ...s, [key]: 'loading' }));
    void fn()
      .then(() => setSlots((s) => ({ ...s, [key]: 'idle' })))
      .catch(() => setSlots((s) => ({ ...s, [key]: 'error' })));
  }, []);

  const roarMonster = MONSTERS.find((m) => m.id === roarMonsterId) ?? MONSTERS[0];
  const notConfigured = manifest?.configured === false;

  return (
    <section className="admin-editor-panel admin-voice-panel">
      <h2 className="admin-editor-title admin-voice-title">
        <Volume2 className="w-5 h-5" aria-hidden="true" /> Voice Test
      </h2>
      <p className="admin-subtitle admin-voice-subtitle">
        Every role goes through the same <code>speak()</code> / <code>roar()</code> calls the arena uses.
      </p>

      {notConfigured && (
        <div className="admin-note admin-note--warn admin-voice-503-note">
          <span>⚠️ <code>503 = ELEVENLABS_KEY not set on this Netlify site.</code> Every Play/Roar button below will stay silent until it is.</span>
        </div>
      )}

      <div className="admin-field">
        <label className="admin-label" htmlFor="voice-test-text">Text to speak</label>
        <Textarea
          id="voice-test-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="admin-voice-roles">
        {ROLES.map((role) => (
          <div key={role} className="admin-voice-role-row">
            <div className="admin-voice-role-info">
              <span className="admin-voice-role-name">{role}</span>
              <span className="admin-voice-role-hint">{ROLE_HINT[role]}</span>
              <span className="admin-voice-role-id">{manifest?.voices?.[role] || (manifestLoading ? 'loading…' : '—')}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={slots[role] === 'loading' || !text.trim()}
              onClick={() => runSlot(role, () => speak(text, role, { interrupt: true }))}
            >
              {slots[role] === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Play'}
            </Button>
            {slots[role] === 'error' && <span className="admin-error-text admin-voice-slot-error">failed</span>}
          </div>
        ))}
      </div>

      <div className="admin-field admin-voice-roar">
        <label className="admin-label" htmlFor="voice-test-roar-monster">Roar test</label>
        <div className="admin-voice-roar-row">
          <select
            id="voice-test-roar-monster"
            className="admin-voice-select"
            value={roarMonsterId}
            onChange={(e) => setRoarMonsterId(e.target.value)}
          >
            {MONSTERS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={slots.roar === 'loading' || !roarMonster}
            onClick={() => roarMonster && runSlot('roar', () => roar(roarMonster))}
          >
            {slots.roar === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Roar'}
          </Button>
          {slots.roar === 'error' && <span className="admin-error-text admin-voice-slot-error">failed</span>}
        </div>
      </div>

      <div className="admin-voice-manifest">
        <div className="admin-section-label admin-voice-manifest-head">
          <span>/api/voice manifest</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => void loadManifest()} disabled={manifestLoading} aria-label="Refresh manifest">
            <RefreshCw className={`w-3.5 h-3.5 ${manifestLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>
        </div>
        {manifestError && <p className="admin-error-text">{manifestError}</p>}
        {manifest && (
          <>
            <p className="admin-voice-configured">
              configured: <strong className={manifest.configured ? 'admin-voice-yes' : 'admin-voice-no'}>{manifest.configured ? 'yes' : 'no'}</strong>
            </p>
            <div className="admin-voice-manifest-grid">
              {Object.entries(manifest.voices).map(([key, id]) => (
                <div key={key} className="admin-voice-manifest-row">
                  <span>{key}</span>
                  <code>{id}</code>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="admin-note admin-voice-env-note">
        Override any voice on Netlify — no deploy needed:
        <ul className="admin-voice-env-list">
          {ENV_VARS.map((v) => <li key={v}><code>{v}</code></li>)}
        </ul>
      </div>
    </section>
  );
}
