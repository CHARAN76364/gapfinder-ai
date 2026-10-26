export interface RawChunk {
  page: number;
  heading: string;
  text: string;
}

const HEAD_RE = /^(unit|module|chapter|section|part|topic|lesson)\b/i;
const SMALL = new Set(['of', 'and', 'the', 'in', 'to', 'for', 'a', 'an', 'vs', 'with', 'on', 'or', 'by']);

export function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/[.,;?]$/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 10) return false;
  if (HEAD_RE.test(t)) return true;
  if (/^\d+(\.\d+)*[.)]?\s+\S/.test(t) && words.length <= 8) return true;
  if (t.endsWith(':')) return true;
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
  const titled = words.every((w) => /^[A-Z0-9(]/.test(w) || SMALL.has(w.toLowerCase()));
  return words.length <= 8 && titled && !/[!?]/.test(t);
}

export function chunkPages(pages: string[], max = 900): RawChunk[] {
  const out: RawChunk[] = [];
  let heading = '';
  pages.forEach((pg, pi) => {
    let buf = '';
    let bufHeading = heading;
    const flush = () => {
      const t = buf.replace(/\s+/g, ' ').trim();
      if (t.length >= 40) out.push({ page: pi + 1, heading: bufHeading, text: t });
      buf = '';
    };
    for (const raw of pg.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) {
        if (buf.length > max * 0.6) flush();
        continue;
      }
      if (isHeading(line)) {
        flush();
        heading = line.replace(/:$/, '').trim();
        continue;
      }
      if (!buf) bufHeading = heading;
      buf += (buf ? ' ' : '') + line;
      if ((buf.length >= max && /[.!?]$/.test(line)) || buf.length > max * 1.8) flush();
    }
    flush();
  });
  return out;
}
