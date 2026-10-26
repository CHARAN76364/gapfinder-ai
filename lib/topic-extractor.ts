export interface RawTopic {
  unit: string;
  name: string;
}

const UNIT_RE = /^\s*(unit|module|chapter|section|part)\s*[-–]?\s*([ivxIVX\d]+)?\s*[:.\-–—)]?\s*(.*)$/i;
const BULLET_RE = /^\s*(?:[-•*▪●◦‣]|\d+(?:\.\d+)*[.)]|[a-z][.)])\s+/;

function clean(s: string): string {
  return s
    .replace(BULLET_RE, '')
    .replace(/^[\s\-–—:•*]+|[\s.;:,\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitItems(s: string): string[] {
  const parts = s.includes(';') ? s.split(';') : s.length < 200 && s.includes(',') ? s.split(',') : [s];
  return parts.map(clean).filter((p) => p.length >= 2 && p.length <= 80);
}

/** Heuristic syllabus parser: subject → unit → topic. */
export function extractTopics(text: string): RawTopic[] {
  const out: RawTopic[] = [];
  const seen = new Set<string>();
  let unit = 'General';
  const push = (u: string, n: string) => {
    const k = n.toLowerCase();
    if (!n || seen.has(k) || out.length >= 60) return;
    seen.add(k);
    out.push({ unit: u, name: n });
  };
  let sawUnit = false;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = UNIT_RE.exec(t);
    if (m && m[1] && (m[2] || m[3] !== undefined)) {
      sawUnit = true;
      const label = `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}${m[2] ? ' ' + m[2] : ''}`;
      const rest = (m[3] || '').trim();
      if (!rest) {
        unit = label;
        continue;
      }
      const colon = rest.search(/\s[-–—]\s|:/);
      if (colon > 0) {
        unit = `${label}: ${clean(rest.slice(0, colon))}`;
        splitItems(rest.slice(colon + 1)).forEach((n) => push(unit, n));
      } else if ((rest.match(/[,;]/g) ?? []).length >= 2) {
        unit = label;
        splitItems(rest).forEach((n) => push(unit, n));
      } else {
        unit = `${label}: ${clean(rest)}`;
      }
      continue;
    }
    if (BULLET_RE.test(t) || (sawUnit && t.length <= 80 && t.split(/\s+/).length <= 10 && !/[.!?]$/.test(t))) {
      splitItems(t).forEach((n) => push(unit, n));
    }
  }
  if (!out.length) {
    for (const line of text.split(/\r?\n/)) {
      const t = clean(line);
      if (t.length >= 3 && t.length <= 70 && t.split(/\s+/).length <= 9 && !/[.!?]$/.test(t)) push('General', t);
    }
  }
  return out;
}
