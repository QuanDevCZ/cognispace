import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface Datum { key: string; label: string; value: number; tip?: string }

const INK = { primary: '#ece6da', secondary: '#a8a397', muted: '#6f6c66', grid: 'rgba(236,230,218,0.07)', axis: 'rgba(236,230,218,0.16)' };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
};

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = Math.max(70, Math.min(w - 70, x));
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] border border-[var(--hair-strong)] bg-ink-700 px-2.5 py-1.5 text-[11.5px] text-bone shadow-xl"
      style={{ left, top: Math.max(30, y - 8) }}>
      {children}
    </div>
  );
}

/** Rounded top corners only, anchored to the baseline. */
const barPath = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

export function BarChart({ data, color = '#ffb454', height = 200, unit = '', target, targetLabel, max }: { data: Datum[]; color?: string; height?: number; unit?: string; target?: number; targetLabel?: string; max?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 14, r: 8, b: 24, l: 34 };
  const iw = Math.max(10, w - m.l - m.r), ih = height - m.t - m.b;
  const top = max ?? niceMax(Math.max(target ?? 0, ...data.map((d) => d.value)));
  const band = iw / Math.max(1, data.length);
  const bw = Math.max(3, Math.min(22, band - 2));
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 44)));

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Bar chart">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={m.l} x2={w - m.r} y1={y(top * f)} y2={y(top * f)} stroke={f === 0 ? INK.axis : INK.grid} />
              <text x={m.l - 8} y={y(top * f) + 3.5} textAnchor="end" fontSize={10} fill={INK.muted} fontFamily="JetBrains Mono">{Math.round(top * f)}</text>
            </g>
          ))}
          {target !== undefined && (
            <g>
              <line x1={m.l} x2={w - m.r} y1={y(target)} y2={y(target)} stroke={INK.secondary} strokeDasharray="2 4" opacity={0.6} />
              <text x={w - m.r} y={y(target) - 5} textAnchor="end" fontSize={10} fill={INK.secondary}>{targetLabel}</text>
            </g>
          )}
          {data.map((d, i) => {
            const x = m.l + i * band + (band - bw) / 2;
            const h = Math.max(d.value > 0 ? 2 : 0, (d.value / top) * ih);
            return (
              <g key={d.key}>
                {h > 0 && <path d={barPath(x, m.t + ih - h, bw, h, 4)} fill={color} opacity={hover === null || hover === i ? 1 : 0.4} style={{ transition: 'opacity .15s' }} />}
                {i % every === 0 && <text x={x + bw / 2} y={height - 7} textAnchor="middle" fontSize={10} fill={hover === i ? INK.primary : INK.muted}>{d.label}</text>}
                <rect x={m.l + i * band} y={m.t} width={band} height={ih + m.b} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tip x={m.l + hover * band + band / 2} y={y(data[hover].value)} w={w}>
          <span className="num font-medium">{data[hover].value}{unit}</span> <span className="text-bone-mute">&middot; {data[hover].tip ?? data[hover].label}</span>
        </Tip>
      )}
    </div>
  );
}

export function LineChart({ data, color = '#ffb454', height = 200, max = 100, unit = '' }: { data: Datum[]; color?: string; height?: number; max?: number; unit?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 14, r: 12, b: 24, l: 34 };
  const iw = Math.max(10, w - m.l - m.r), ih = height - m.t - m.b;
  const x = (i: number) => m.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2);
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const area = data.length ? `${line}L${x(data.length - 1)},${m.t + ih}L${x(0)},${m.t + ih}Z` : '';
  const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 56)));
  const last = data[data.length - 1];
  const gid = `lg-${color.replace('#', '')}`;

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const i = Math.round(((cx - rect.left - m.l) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseMove={onMove} onTouchStart={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Line chart">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.22} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={m.l} x2={w - m.r} y1={y(max * f)} y2={y(max * f)} stroke={f === 0 ? INK.axis : INK.grid} />
              <text x={m.l - 8} y={y(max * f) + 3.5} textAnchor="end" fontSize={10} fill={INK.muted} fontFamily="JetBrains Mono">{Math.round(max * f)}</text>
            </g>
          ))}
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => i % every === 0 && <text key={d.key} x={x(i)} y={height - 7} textAnchor="middle" fontSize={10} fill={INK.muted}>{d.label}</text>)}
          {last && hover === null && (
            <g>
              <circle cx={x(data.length - 1)} cy={y(last.value)} r={4.5} fill={color} stroke="#0e1014" strokeWidth={2} />
              <text x={x(data.length - 1) - 9} y={y(last.value) - 9} textAnchor="end" fontSize={11} fill={INK.primary} fontFamily="JetBrains Mono">{last.value}{unit}</text>
            </g>
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={INK.axis} />
              <circle cx={x(hover)} cy={y(data[hover].value)} r={4.5} fill={color} stroke="#0e1014" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tip x={x(hover)} y={y(data[hover].value)} w={w}>
          <span className="num font-medium">{data[hover].value}{unit}</span> <span className="text-bone-mute">&middot; {data[hover].tip ?? data[hover].label}</span>
        </Tip>
      )}
    </div>
  );
}

/** Horizontal labelled bars: value out of a total, identity carried by the label. */
export function Meters({ rows }: { rows: { key: string; label: string; value: number; total: number; color: string; note?: string }[] }) {
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.value} of ${r.total}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2 text-bone-dim"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: r.color }} /><span className="truncate">{r.label}</span></span>
            <span className="num shrink-0 text-bone">{r.note ?? <>{r.value}<span className="text-bone-faint">/{r.total}</span></>}</span>
          </div>
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r.total ? (r.value / r.total) * 100 : 0}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Spark({ values, color = '#ffb454', w = 84, h = 26 }: { values: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * (w - 4) + 2},${h - 3 - (v / max) * (h - 6)}`).join(' ');
  return <svg width={w} height={h} aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} /></svg>;
}
