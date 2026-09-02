// In-memory stand-in for @netlify/blobs used by tests/functions.test.mjs.
const stores = new Map();
export function __reset() { stores.clear(); }
export function getStore(name) {
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  const etagOf = (v) => 'etag-' + String(v.length ?? 0) + '-' + Math.abs([...(typeof v === 'string' ? v : '')].reduce((a, c) => a + c.charCodeAt(0), 0));
  return {
    async set(key, blob, opts = {}) {
      const buf = blob instanceof Blob ? Buffer.from(await blob.arrayBuffer()) : Buffer.from(String(blob));
      m.set(key, { buf, text: typeof blob === 'string' ? blob : null, metadata: opts.metadata || {}, etag: 'etag-' + buf.length });
    },
    async setJSON(key, value, opts = {}) { const text = JSON.stringify(value); m.set(key, { buf: Buffer.from(text), text, metadata: opts.metadata || {}, etag: etagOf(text) }); },
    async get(key, opts = {}) {
      const e = m.get(key); if (!e) return null;
      if (opts.type === 'json') return JSON.parse(e.text ?? e.buf.toString());
      if (opts.type === 'arrayBuffer') return e.buf.buffer.slice(e.buf.byteOffset, e.buf.byteOffset + e.buf.byteLength);
      return e.text ?? e.buf.toString();
    },
    async getWithMetadata(key, opts = {}) {
      const e = m.get(key); if (!e) return null;
      const data = opts.type === 'arrayBuffer' ? e.buf.buffer.slice(e.buf.byteOffset, e.buf.byteOffset + e.buf.byteLength) : opts.type === 'json' ? JSON.parse(e.text ?? e.buf.toString()) : (e.text ?? e.buf.toString());
      return { data, metadata: e.metadata, etag: e.etag };
    },
    async getMetadata(key) { const e = m.get(key); return e ? { metadata: e.metadata, etag: e.etag } : null; },
    async delete(key) { m.delete(key); },
    async list() { return { blobs: [...m.entries()].map(([key, e]) => ({ key, etag: e.etag })) }; },
  };
}
