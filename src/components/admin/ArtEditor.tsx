import { useEffect, useRef, useState, DragEvent } from 'react';
import { UploadCloud, Link2, Wand2, Trash2, RefreshCw, Loader2, Info } from 'lucide-react';
import { Monster } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  loadImageFromBlob, processImage, ProcessImageResult, formatBytes,
} from './imagePipeline';
import { uploadMonsterImageDataUrl, uploadMonsterImageUrl, deleteMonsterImage } from './adminApi';

const MAX_SIDE = 1024;
const QUALITY = 0.86;

interface ArtEditorProps {
  monster: Monster;
  adminKey: string;
  hasArt: boolean;
  currentImageUrl: string | undefined;
  /** True when this id has no custom override yet, so it can't store a facing direction. */
  showFacingNote: boolean;
  /** True while the monster itself hasn't been saved yet (brand-new custom monster). */
  disabled: boolean;
  onChanged: () => void;
}

export function ArtEditor({ monster, adminKey, hasArt, currentImageUrl, showFacingNote, disabled, onChanged }: ArtEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceBytes, setSourceBytes] = useState<number | null>(null);
  const [cutout, setCutout] = useState(false);
  const [tolerance, setTolerance] = useState(32);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvaLink, setCanvaLink] = useState('');
  const [linkFallbackUrl, setLinkFallbackUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reoptimizing, setReoptimizing] = useState(false);

  const runPipeline = async (img: HTMLImageElement) => {
    setProcessing(true);
    setError(null);
    try {
      const r = await processImage(img, { maxSide: MAX_SIDE, cutout, tolerance, quality: QUALITY });
      setResult(r);
      return r;
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Could not process that image');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  // Re-process automatically when the cut-out toggle or tolerance changes (debounced while dragging).
  useEffect(() => {
    if (!sourceImage) return;
    const t = setTimeout(() => { runPipeline(sourceImage); }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout, tolerance, sourceImage]);

  const reset = () => {
    setSourceImage(null);
    setSourceLabel('');
    setSourceBytes(null);
    setResult(null);
    setError(null);
    setLinkFallbackUrl(null);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (PNG, JPG, or WebP).'); return; }
    setError(null);
    try {
      const img = await loadImageFromBlob(file);
      setSourceImage(img);
      setSourceLabel(file.name);
      setSourceBytes(file.size);
      setLinkFallbackUrl(null);
      await runPipeline(img);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file');
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLoadCanvaLink = async () => {
    const trimmed = canvaLink.trim();
    if (!trimmed) return;
    let parsed: URL;
    try { parsed = new URL(trimmed); } catch { setError('That does not look like a valid URL.'); return; }
    if (parsed.protocol !== 'https:') { setError('The link must start with https://'); return; }

    setLoadingLink(true);
    setError(null);
    setLinkFallbackUrl(null);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('cors'));
        el.src = parsed.toString();
      });
      setSourceImage(img);
      setSourceLabel('pasted Canva link');
      setSourceBytes(null);
      const processed = await runPipeline(img);
      if (!processed) setLinkFallbackUrl(parsed.toString());
    } catch {
      setSourceImage(null);
      setLinkFallbackUrl(parsed.toString());
      setError("Couldn't load that link into the editor — the site likely blocks cross-origin image reads, so resize/cut-out aren't possible here. You can still upload the link directly below; the server will fetch it as-is.");
    } finally {
      setLoadingLink(false);
    }
  };

  const handleUploadDirectLink = async () => {
    if (!linkFallbackUrl) return;
    setUploading(true);
    const res = await uploadMonsterImageUrl(adminKey, monster.id, linkFallbackUrl);
    setUploading(false);
    if (res.ok) {
      toast({ title: 'Art uploaded', description: `${monster.name}'s artwork was fetched by the server as-is (no resize or cut-out).` });
      reset();
      setCanvaLink('');
      onChanged();
    } else {
      toast({ variant: 'destructive', title: 'Upload failed', description: res.message });
    }
  };

  const handleUpload = async () => {
    if (!result) return;
    setUploading(true);
    const res = await uploadMonsterImageDataUrl(adminKey, monster.id, result.dataUrl);
    setUploading(false);
    if (res.ok) {
      toast({ title: 'Art uploaded', description: `${monster.name} now has cloud art — ${formatBytes(res.bytes ?? result.bytes)}, ${res.contentType ?? result.mime}.` });
      reset();
      setCanvaLink('');
      onChanged();
    } else {
      toast({ variant: 'destructive', title: 'Upload failed', description: res.message });
    }
  };

  const handleReoptimize = async () => {
    if (!currentImageUrl) return;
    setReoptimizing(true);
    setError(null);
    try {
      const res = await fetch(currentImageUrl);
      if (!res.ok) throw new Error(`Could not fetch the current image (HTTP ${res.status})`);
      const blob = await res.blob();
      const originalBytes = blob.size;
      const img = await loadImageFromBlob(blob);
      const processed = await processImage(img, { maxSide: MAX_SIDE, cutout, tolerance, quality: QUALITY });
      setSourceImage(img);
      setSourceLabel('existing cloud art');
      setSourceBytes(originalBytes);
      setResult(processed);
      const uploadRes = await uploadMonsterImageDataUrl(adminKey, monster.id, processed.dataUrl);
      if (uploadRes.ok) {
        toast({
          title: 'Re-optimized',
          description: `${monster.name}: ${formatBytes(originalBytes)} → ${formatBytes(processed.bytes)} (${processed.mime}).`,
        });
        onChanged();
      } else {
        toast({ variant: 'destructive', title: 'Re-optimize upload failed', description: uploadRes.message });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not re-optimize the existing art');
    } finally {
      setReoptimizing(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    const res = await deleteMonsterImage(adminKey, monster.id);
    setRemoving(false);
    if (res.ok) {
      toast({ title: 'Art removed', description: `${monster.name} has no cloud art now.` });
      onChanged();
    } else {
      toast({ variant: 'destructive', title: 'Remove failed', description: res.message });
    }
  };

  if (disabled) {
    return (
      <div className="admin-empty-state">
        <Info className="w-4 h-4 inline mr-1.5 -mt-0.5" aria-hidden="true" />
        Save this monster first (in the Monster Info tab) — then its artwork can be uploaded here.
      </div>
    );
  }

  return (
    <div className="admin-art-editor">
      {showFacingNote && (
        <div className="admin-note">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Bundled monsters can&rsquo;t store a facing direction yet. If this art faces left, save an override in the
            <strong> Monster Info</strong> tab first — a &ldquo;faces left&rdquo; switch appears there.
          </span>
        </div>
      )}

      <div
        className={`admin-dropzone ${dragOver ? 'admin-dropzone--over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <UploadCloud className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        <p>Drag &amp; drop a Canva export here, or tap to choose a file</p>
        <span className="admin-dropzone-hint">PNG, JPG or WebP</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="admin-link-row">
        <Link2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <Input
          value={canvaLink}
          onChange={(e) => setCanvaLink(e.target.value)}
          placeholder="Paste a Canva export link (https://...)"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleLoadCanvaLink} disabled={!canvaLink.trim() || loadingLink}>
          {loadingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load for editing'}
        </Button>
      </div>

      {linkFallbackUrl && (
        <div className="admin-note admin-note--warn">
          <span>Can&rsquo;t edit this one in the browser.</span>
          <Button type="button" size="sm" variant="outline" onClick={handleUploadDirectLink} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload the link directly'}
          </Button>
        </div>
      )}

      {error && <p className="admin-error-text">{error}</p>}

      {sourceImage && (
        <div className="admin-pipeline">
          <p className="admin-pipeline-source">Editing: {sourceLabel}{sourceBytes ? ` (${formatBytes(sourceBytes)} original)` : ''}</p>

          <div className="admin-pipeline-row">
            <label className="admin-toggle-row">
              <Switch checked={cutout} onCheckedChange={setCutout} />
              <span><Wand2 className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />Magic cut-out (remove background)</span>
            </label>
            {cutout && (
              <div className="admin-tolerance">
                <span>Tolerance: {tolerance}</span>
                <Slider min={0} max={80} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} />
              </div>
            )}
          </div>

          <div className="admin-preview-row">
            <div className="admin-preview-checker">
              {processing ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : result ? (
                <img src={result.dataUrl} alt="Processed preview" />
              ) : null}
            </div>
            {result && (
              <div className="admin-preview-meta">
                <p>{result.width}×{result.height}px</p>
                <p>{formatBytes(result.bytes)} · {result.mime === 'image/webp' ? 'WebP' : 'PNG'}</p>
              </div>
            )}
          </div>

          <div className="admin-art-actions">
            <Button type="button" onClick={handleUpload} disabled={!result || processing || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload this art'}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} disabled={uploading}>Cancel</Button>
          </div>
        </div>
      )}

      {hasArt && (
        <div className="admin-existing-art">
          <p className="admin-section-label">Existing cloud art</p>
          <div className="admin-existing-art-row">
            {currentImageUrl && <img src={currentImageUrl} alt={`${monster.name} current art`} className="admin-existing-thumb" />}
            <div className="admin-existing-actions">
              <Button type="button" variant="secondary" size="sm" onClick={handleReoptimize} disabled={reoptimizing}>
                {reoptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Re-optimize existing art
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={removing}>
                    <Trash2 className="w-4 h-4" /> Remove art
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {monster.name}&rsquo;s artwork?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the cloud image. {monster.name} will show its fallback silhouette in the game until new art is uploaded.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove}>Remove art</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
