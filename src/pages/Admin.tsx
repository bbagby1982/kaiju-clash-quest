import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import '@/styles/admin.css';
import { useAdminKey } from '@/components/admin/useAdminKey';
import { AdminKeyBar } from '@/components/admin/AdminKeyBar';
import { MonsterGallery } from '@/components/admin/MonsterGallery';
import { MonsterEditor } from '@/components/admin/MonsterEditor';
import { VoicePanel } from '@/components/admin/VoicePanel';

/** null = create-new. A string id = editing that monster. Nothing selected = the gallery. */
type Target = { id: string | null } | null;

export default function Admin() {
  const { key, setKey } = useAdminKey();
  const [target, setTarget] = useState<Target>(null);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-top">
          <Link to="/" className="admin-home-link">
            <ArrowLeft className="w-4 h-4" /> Back to game
          </Link>
        </div>
        <h1 className="admin-title">
          <Sparkles className="w-6 h-6" aria-hidden="true" /> MONSTER STUDIO
        </h1>
        <p className="admin-subtitle">Add art from Canva and design brand-new kaiju for Kaiju Clash Quest.</p>
        <AdminKeyBar adminKey={key} onChange={setKey} />
      </header>

      <main className="admin-main">
        {target ? (
          <MonsterEditor
            key={target.id ?? '__new__'}
            id={target.id}
            adminKey={key}
            onBack={() => setTarget(null)}
            onSavedNew={(id) => setTarget({ id })}
          />
        ) : (
          <MonsterGallery
            onSelect={(id) => setTarget({ id })}
            onCreateNew={() => setTarget({ id: null })}
          />
        )}

        <VoicePanel />
      </main>
    </div>
  );
}
