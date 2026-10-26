export interface Parsed {
  pages: string[];
  paged: boolean;
}

function splitPlain(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n');
  if (clean.includes('\f')) return clean.split('\f').filter((p) => p.trim());
  const paras = clean.split(/\n\s*\n/);
  const pages: string[] = [];
  let cur = '';
  for (const p of paras) {
    if (cur.length + p.length > 3500 && cur) {
      pages.push(cur);
      cur = '';
    }
    cur += (cur ? '\n\n' : '') + p;
  }
  if (cur.trim()) pages.push(cur);
  return pages;
}

export async function parseFile(name: string, buf: Buffer): Promise<Parsed> {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const mod = (await import('pdf-parse/lib/pdf-parse.js')) as unknown as { default?: unknown };
    const pdf = (mod.default ?? mod) as (b: Buffer, o?: Record<string, unknown>) => Promise<unknown>;
    const pages: string[] = [];
    await pdf(buf, {
      pagerender: async (pageData: {
        getTextContent: (o: unknown) => Promise<{ items: { str: string; transform: number[] }[] }>;
      }) => {
        const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
        let lastY: number | undefined;
        let text = '';
        for (const item of tc.items) {
          const y = item.transform[5];
          if (lastY === undefined || lastY === y) text += item.str;
          else text += '\n' + item.str;
          lastY = y;
        }
        pages.push(text);
        return text;
      },
    });
    const nonEmpty = pages.filter((p) => p.trim().length > 0);
    if (!nonEmpty.length) throw new Error('No extractable text found (is this a scanned PDF?). Try a text-based PDF or a .txt file.');
    return { pages, paged: true };
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.text')) {
    const text = buf.toString('utf8');
    if (!text.trim()) throw new Error('The file is empty.');
    return { pages: splitPlain(text), paged: false };
  }
  throw new Error('Unsupported file type. Please upload a PDF or a .txt / .md file.');
}

export function parseText(text: string): Parsed {
  if (!text.trim()) throw new Error('The text is empty.');
  return { pages: splitPlain(text), paged: false };
}
