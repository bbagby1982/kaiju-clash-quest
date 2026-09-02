/**
 * Client-side image pipeline for the Monster Studio art uploader.
 *
 * Every image (a Canva PNG export, a phone photo of a drawing, an existing cloud
 * image being re-optimized) goes through the same three steps before it is POSTed
 * to /api/admin/upload-monster-image as a data: URL:
 *   1. resize so the longest side is <= maxSide (the live images used to be 3-6 MB
 *      PNGs straight out of Canva — brutal on an iPad's data plan)
 *   2. optional "magic cut-out": flood-fill transparency in from the four corners
 *   3. encode as WebP (small, alpha-capable) with a PNG fallback for browsers that
 *      cannot produce WebP (older Safari) — PNG keeps the cut-out's transparency too.
 */

export interface CutoutOptions {
  /** 0-80. How close (Euclidean RGB distance) a pixel must be to the corner colour to be erased. */
  tolerance: number;
}

export interface ProcessImageOptions {
  /** Longest side of the output, in px. */
  maxSide: number;
  /** Run the background flood-fill cut-out. */
  cutout: boolean;
  /** Cut-out tolerance, 0-80. Ignored when cutout is false. */
  tolerance: number;
  /** WebP quality, 0-1. */
  quality: number;
}

export interface ProcessImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  mime: 'image/webp' | 'image/png';
}

/** Decode a File/Blob into an <img>, without leaking the object URL. */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that as an image'));
    };
    img.src = url;
  });
}

/** Draw an image onto a canvas scaled so its longest side is <= maxSide (never upscales). */
export function resizeToCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('Image has no dimensions');
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw on a canvas');
  ctx.drawImage(img, 0, 0, outW, outH);
  return canvas;
}

/**
 * Erases the background in place: a multi-source BFS flood fill starting at the four
 * corners, matched against the averaged corner colour within `tolerance`, followed by
 * a 1px feather (edge pixels touching a removed pixel get their alpha halved) so the
 * cut edge doesn't look jagged against the game's dark backgrounds.
 */
export function magicCutout(canvas: HTMLCanvasElement, { tolerance }: CutoutOptions): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 2 || h < 2) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const pxIndex = (x: number, y: number) => (y * w + x) * 4;

  const corners: [number, number][] = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  let refR = 0, refG = 0, refB = 0;
  for (const [cx, cy] of corners) {
    const i = pxIndex(cx, cy);
    refR += data[i]; refG += data[i + 1]; refB += data[i + 2];
  }
  refR /= 4; refG /= 4; refB /= 4;

  const tolerance2 = tolerance * tolerance * 3; // squared distance threshold across 3 channels
  const within = (i: number): boolean => {
    const dr = data[i] - refR, dg = data[i + 1] - refG, db = data[i + 2] - refB;
    return dr * dr + dg * dg + db * db <= tolerance2;
  };

  const n = w * h;
  const visited = new Uint8Array(n);
  const removed = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (const [cx, cy] of corners) {
    const p = cy * w + cx;
    if (!visited[p]) { visited[p] = 1; queue[tail++] = p; }
  }

  while (head < tail) {
    const p = queue[head++];
    const i = p * 4;
    if (!within(i)) continue;
    removed[p] = 1;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) { const np = p - 1; if (!visited[np]) { visited[np] = 1; queue[tail++] = np; } }
    if (x < w - 1) { const np = p + 1; if (!visited[np]) { visited[np] = 1; queue[tail++] = np; } }
    if (y > 0) { const np = p - w; if (!visited[np]) { visited[np] = 1; queue[tail++] = np; } }
    if (y < h - 1) { const np = p + w; if (!visited[np]) { visited[np] = 1; queue[tail++] = np; } }
  }

  for (let p = 0; p < n; p++) {
    if (removed[p]) data[p * 4 + 3] = 0;
  }

  // 1px feather: opaque pixels bordering a removed pixel get a softened edge alpha.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (removed[p]) continue;
      const touchesRemoved =
        (x > 0 && removed[p - 1]) ||
        (x < w - 1 && removed[p + 1]) ||
        (y > 0 && removed[p - w]) ||
        (y < h - 1 && removed[p + w]);
      if (touchesRemoved) {
        const i = p * 4;
        data[i + 3] = Math.round(data[i + 3] * 0.5);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

let webpSupportPromise: Promise<boolean> | null = null;
/** True when this browser's canvas can actually produce a WebP blob (not just accept the MIME and silently give PNG back). */
export function supportsWebP(): Promise<boolean> {
  if (!webpSupportPromise) {
    webpSupportPromise = (async () => {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 2;
      const blob = await canvasToBlob(c, 'image/webp');
      return !!blob && blob.type === 'image/webp';
    })();
  }
  return webpSupportPromise;
}

/** WebP when the browser can really produce it, PNG otherwise — PNG keeps cut-out transparency either way. */
async function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<{ blob: Blob; mime: 'image/webp' | 'image/png' }> {
  const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);
  if (webpBlob && webpBlob.type === 'image/webp' && webpBlob.size > 0) {
    return { blob: webpBlob, mime: 'image/webp' };
  }
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  if (!pngBlob) throw new Error('This browser could not encode the image');
  return { blob: pngBlob, mime: 'image/png' };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the processed image'));
    reader.readAsDataURL(blob);
  });
}

/** Full pipeline: resize -> optional cut-out -> encode -> data URL, ready to POST. */
export async function processImage(source: HTMLImageElement, opts: ProcessImageOptions): Promise<ProcessImageResult> {
  const canvas = resizeToCanvas(source, opts.maxSide);
  if (opts.cutout) magicCutout(canvas, { tolerance: opts.tolerance });
  const { blob, mime } = await encodeCanvas(canvas, opts.quality);
  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl, width: canvas.width, height: canvas.height, bytes: blob.size, mime };
}

/** hex (#rrggbb) -> "hsl(H S% L%)" in the exact form the server's sanitizer and the rest of the app expect. */
export function hexToHslString(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return 'hsl(120 40% 25%)';
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
