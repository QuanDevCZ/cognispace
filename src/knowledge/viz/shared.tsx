import { useEffect, useRef, useState, type ReactNode } from 'react';

export const C = { amber: '#ffb454', ion: '#5fd4c4', ember: '#ff6b5e', bone: '#ece6da', dim: '#a8a397', mute: '#6f6c66', faint: 'rgba(236,230,218,0.14)', grid: 'rgba(236,230,218,0.07)' };

/** Seconds since mount, updated on animation frames (throttled to ~30fps). */
export function useClock(active = true) {
  const [t, setT] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = 0;
    const loop = (now: number) => {
      if (start.current === null) start.current = now;
      if (now - last > 32) { last = now; setT((now - start.current) / 1000); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return t;
}

export function Slider({ label, value, min, max, step = 0.01, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-0.5 flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        <span className="num text-[12px] text-amber">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

export function Readout({ k, v, tone }: { k: string; v: ReactNode; tone?: string }) {
  return (
    <div className="rounded-[9px] border border-hair px-3 py-2">
      <div className="label mb-0.5">{k}</div>
      <div className="num text-[15px]" style={{ color: tone ?? C.bone }}>{v}</div>
    </div>
  );
}

export const softmax = (logits: number[], T = 1) => {
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp((l - m) / Math.max(0.01, T)));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const seeded = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
