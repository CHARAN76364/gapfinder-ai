import type { ProgressPoint } from '@/types/performance';

export default function ProgressChart({ points }: { points: ProgressPoint[] }) {
  if (!points.length) return <p className="muted">Take your first quiz to start tracking progress.</p>;
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 16, t: 16, b: 32 };
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${x(i)},${y(p.scorePct)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Quiz score history">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="#e2e8f0" />
          <text x={pad.l - 6} y={y(g) + 4} fontSize="10" textAnchor="end" fill="#64748b">
            {g}
          </text>
        </g>
      ))}
      {points.length > 1 && <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="2.5" />}
      {points.map((p, i) => (
        <g key={p.quizId}>
          <circle cx={x(i)} cy={y(p.scorePct)} r="5" fill="#4f46e5" />
          <text x={x(i)} y={y(p.scorePct) - 10} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="600">
            {p.scorePct}%
          </text>
          <text x={x(i)} y={H - 10} fontSize="10" textAnchor="middle" fill="#64748b">
            Quiz {p.number}
          </text>
        </g>
      ))}
    </svg>
  );
}
