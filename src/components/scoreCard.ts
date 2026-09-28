import type { CrsResult } from '../crs/types';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import { formatDate } from './format';

const W = 1320;
const C = {
  bg: '#f6f5f2',
  card: '#ffffff',
  border: '#e4e2dc',
  text: '#16150f',
  text2: '#57554e',
  text3: '#85827a',
  accent: '#d52b1e',
  track: '#f1f0ec',
  good: '#137a3e',
  goodSoft: '#e3f3e8',
  bad: '#b3261e',
  badSoft: '#fbe7e5',
};
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Shorter names where the on-screen label is too long for a card column. */
const SHORT: Record<string, string> = {
  'Spouse or common-law partner': 'Spouse / partner',
  'Education + language / Canadian work': 'Education combination',
  'Foreign work + language / Canadian work': 'Foreign work combination',
  'Trade certificate + language': 'Trade certificate combo',
  'Spouse Canadian work experience': 'Spouse Canadian work',
  'Spouse official language': 'Spouse language',
  'Post-secondary study in Canada': 'Study in Canada',
};

const COL_W = 360;
const COL_B_X = 460 + COL_W + 40;
const LABEL_H = 28;
const HINT_LINE_H = 18;
const ROW_PAD = 10;
const HEAD_H = 40;
const SECTION_GAP = 26;
const HINT_FONT = `400 13px ${FONT}`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

type LineView = { label: string; points: number; max: number; hint?: string };
type SectionView = { title: string; points: number; max: number; lines: LineView[] };

/** Word-wrap to at most `maxLines`, ellipsising whatever doesn't fit. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines = 2) {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= width || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, width);
    return kept;
  }
  return lines;
}

const hintLines = (ctx: CanvasRenderingContext2D, l: LineView) => {
  if (!l.hint) return [];
  ctx.font = HINT_FONT;
  return wrap(ctx, l.hint, COL_W);
};
const rowHeight = (ctx: CanvasRenderingContext2D, l: LineView) => LABEL_H + hintLines(ctx, l).length * HINT_LINE_H + ROW_PAD;
const sectionHeight = (ctx: CanvasRenderingContext2D, s: SectionView) =>
  HEAD_H + (s.lines.length ? s.lines.reduce((h, l) => h + rowHeight(ctx, l), 0) : LABEL_H + ROW_PAD);

/** Draws a section: title with subtotal, then every line that earned points. */
function drawSection(ctx: CanvasRenderingContext2D, s: SectionView, x: number, y: number) {
  const right = x + COL_W;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText(fitText(ctx, SHORT[s.title] ?? s.title, COL_W - 110), x, y + 20);
  drawPoints(ctx, s.points, s.max, right, y + 20, 17);
  ctx.fillStyle = C.text;
  ctx.fillRect(x, y + 30, COL_W, 2);

  let ry = y + HEAD_H;
  if (!s.lines.length) {
    ctx.fillStyle = C.text3;
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText('No points yet', x, ry + 20);
    return;
  }
  for (const [i, l] of s.lines.entries()) {
    const h = rowHeight(ctx, l);
    const hints = hintLines(ctx, l);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font = `500 15px ${FONT}`;
    ctx.fillText(fitText(ctx, SHORT[l.label] ?? l.label, COL_W - 90), x, ry + 20);
    drawPoints(ctx, l.points, l.max, right, ry + 20, 15);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text3;
    ctx.font = HINT_FONT;
    hints.forEach((line, j) => ctx.fillText(line, x, ry + LABEL_H + 12 + j * HINT_LINE_H));
    if (i < s.lines.length - 1) {
      ctx.fillStyle = C.border;
      ctx.fillRect(x, ry + h - 1, COL_W, 1);
    }
    ry += h;
  }
}

/** Right-aligned "points / max", with the max de-emphasised. */
function drawPoints(ctx: CanvasRenderingContext2D, points: number, max: number, right: number, y: number, size: number) {
  ctx.textAlign = 'right';
  ctx.font = `400 ${size - 2}px ${FONT}`;
  ctx.fillStyle = C.text3;
  const maxLabel = ` / ${max}`;
  ctx.fillText(maxLabel, right, y);
  const w = ctx.measureText(maxLabel).width;
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.fillStyle = C.text;
  ctx.fillText(String(points), right - w, y);
  ctx.textAlign = 'left';
}

/**
 * Render a share card for a CRS result: the total, every section subtotal and each
 * factor that earned points. Width is fixed; height grows with the number of factors.
 */
export async function renderScoreCard(result: CrsResult, benchmark: Draw | undefined, name: string): Promise<Blob> {
  await document.fonts?.ready;

  const sections: SectionView[] = result.sections.map((s) => ({
    title: s.title,
    points: s.points,
    max: s.max,
    lines: s.lines.filter((l) => l.points > 0),
  }));
  const measure = document.createElement('canvas').getContext('2d')!;
  // Two balanced columns: core (+ spouse) on the left, the rest on the right.
  const colA = sections.filter((s) => s.title.startsWith('Core') || s.title.startsWith('Spouse'));
  const colB = sections.filter((s) => !colA.includes(s));
  const colHeight = (col: SectionView[]) => col.reduce((h, s) => h + sectionHeight(measure, s) + SECTION_GAP, -SECTION_GAP);

  const top = 170;
  const contentBottom = Math.max(top + colHeight(colA), top + colHeight(colB), 560);
  const H = contentBottom + 110;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.card;
  ctx.strokeStyle = C.border;
  roundRect(ctx, 40, 40, W - 80, H - 80, 24);
  ctx.fill();
  ctx.stroke();

  // Header
  ctx.fillStyle = C.accent;
  roundRect(ctx, 80, 80, 40, 40, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 100, 101);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('Express Entry CRS score', 136, 94);
  ctx.fillStyle = C.text3;
  ctx.font = `400 16px ${FONT}`;
  ctx.fillText(
    fitText(ctx, `${name} · ${result.withSpouse ? 'with spouse' : 'single applicant'} · ${formatDate(new Date().toISOString().slice(0, 10))}`, 900),
    136,
    118,
  );

  // Total ring
  const cx = 240;
  const cy = top + 140;
  const r = 118;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.track;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.min(result.total, 1200) / 1200) * Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = `700 76px ${FONT}`;
  ctx.fillText(String(result.total), cx, cy - 6);
  ctx.fillStyle = C.text3;
  ctx.font = `400 17px ${FONT}`;
  ctx.fillText('of 1,200', cx, cy + 44);

  // Benchmark under the ring
  if (benchmark) {
    const gap = result.total - benchmark.crs;
    const good = gap >= 0;
    const bx = 80;
    const by = cy + r + 40;
    const bw = 330;
    ctx.fillStyle = good ? C.goodSoft : C.badSoft;
    roundRect(ctx, bx, by, bw, 70, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = good ? C.good : C.bad;
    ctx.font = `700 19px ${FONT}`;
    ctx.fillText(good ? `${gap} above the latest cutoff` : `${-gap} below the latest cutoff`, bx + bw / 2, by + 30);
    ctx.font = `400 14px ${FONT}`;
    const when = formatDate(benchmark.date, { month: 'short', day: 'numeric' });
    ctx.fillText(fitText(ctx, `${CATEGORY_LABELS[benchmark.category]} · ${benchmark.crs} on ${when}`, bw - 20), bx + bw / 2, by + 53);
  }

  // Factor breakdown
  let y = top;
  for (const s of colA) {
    drawSection(ctx, s, 460, y);
    y += sectionHeight(ctx, s) + SECTION_GAP;
  }
  y = top;
  for (const s of colB) {
    drawSection(ctx, s, COL_B_X, y);
    y += sectionHeight(ctx, s) + SECTION_GAP;
  }

  // Footer
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.border;
  ctx.fillRect(80, H - 108, W - 160, 1);
  ctx.font = `400 14px ${FONT}`;
  ctx.fillStyle = C.text3;
  ctx.textAlign = 'left';
  ctx.fillText('Unofficial estimate based on IRCC’s published CRS criteria.', 80, H - 76);
  ctx.textAlign = 'right';
  ctx.fillText(location.host, W - 80, H - 76);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render image'))), 'image/png'));
}

export async function downloadScoreCard(...args: Parameters<typeof renderScoreCard>) {
  const blob = await renderScoreCard(...args);
  const file = new File([blob], `crs-score-${args[0].total}.png`, { type: 'image/png' });
  // Native share sheet on phones; plain download elsewhere.
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: `My CRS score: ${args[0].total}` });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const canCopyImage = () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

/** Copy the card to the clipboard as a PNG, ready to paste into chats or docs. */
export async function copyScoreCard(...args: Parameters<typeof renderScoreCard>) {
  // Safari needs the ClipboardItem created synchronously in the click handler, with the image as a promise.
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderScoreCard(...args) })]);
}
