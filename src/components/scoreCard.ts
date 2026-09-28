import type { CrsResult } from '../crs/types';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import { formatDate } from './format';

const W = 1200;
const H = 630;
const C = {
  bg: '#f6f5f2',
  card: '#ffffff',
  border: '#e4e2dc',
  text: '#16150f',
  text2: '#57554e',
  text3: '#85827a',
  accent: '#d52b1e',
  track: '#f1f0ec',
  series: '#2a78d6',
  good: '#137a3e',
  goodSoft: '#e3f3e8',
  bad: '#b3261e',
  badSoft: '#fbe7e5',
};
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Render a 1200×630 share card (social-preview size) for a CRS result. */
export async function renderScoreCard(result: CrsResult, benchmark: Draw | undefined, name: string): Promise<Blob> {
  await document.fonts?.ready;
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
  ctx.fillText(`${name} · ${result.withSpouse ? 'with spouse' : 'single applicant'} · ${formatDate(new Date().toISOString().slice(0, 10))}`, 136, 118);

  // Ring
  const cx = 250;
  const cy = 340;
  const r = 130;
  ctx.lineWidth = 20;
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
  ctx.font = `700 84px ${FONT}`;
  ctx.fillText(String(result.total), cx, cy - 6);
  ctx.fillStyle = C.text3;
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText('of 1,200', cx, cy + 48);

  // Breakdown bars
  const x0 = 460;
  const barW = 640;
  let y = 180;
  ctx.textAlign = 'left';
  for (const s of result.sections) {
    ctx.fillStyle = C.text;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(s.title, x0, y);
    ctx.textAlign = 'right';
    ctx.font = `700 20px ${FONT}`;
    const maxLabel = ` / ${s.max}`;
    ctx.fillStyle = C.text3;
    ctx.font = `400 16px ${FONT}`;
    const maxW = ctx.measureText(maxLabel).width;
    ctx.fillText(maxLabel, x0 + barW, y + 1);
    ctx.fillStyle = C.text;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(String(s.points), x0 + barW - maxW, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.track;
    roundRect(ctx, x0, y + 18, barW, 10, 5);
    ctx.fill();
    if (s.points > 0) {
      ctx.fillStyle = C.series;
      roundRect(ctx, x0, y + 18, Math.max(10, (s.points / s.max) * barW), 10, 5);
      ctx.fill();
    }
    y += 70;
  }

  // Benchmark
  if (benchmark) {
    const gap = result.total - benchmark.crs;
    const good = gap >= 0;
    const by = H - 150;
    ctx.fillStyle = good ? C.goodSoft : C.badSoft;
    roundRect(ctx, x0, by, barW, 56, 12);
    ctx.fill();
    ctx.fillStyle = good ? C.good : C.bad;
    ctx.font = `700 20px ${FONT}`;
    const headline = good ? `${gap} above the latest cutoff` : `${-gap} below the latest cutoff`;
    ctx.fillText(headline, x0 + 18, by + 28);
    ctx.textAlign = 'right';
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText(`${CATEGORY_LABELS[benchmark.category]} · ${benchmark.crs} · ${formatDate(benchmark.date)}`, x0 + barW - 18, by + 29);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = C.text3;
  ctx.font = `400 15px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(location.host, W - 80, H - 62);

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
