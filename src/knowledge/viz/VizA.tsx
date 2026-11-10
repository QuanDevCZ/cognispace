import { useMemo, useState } from 'react';
import { C, Readout, Slider, clamp, seeded, useClock } from './shared';

/* -------------------------------- neuron -------------------------------- */

export function NeuronViz() {
  const [w1, setW1] = useState(1.2);
  const [w2, setW2] = useState(-0.6);
  const [b, setB] = useState(-0.2);
  const x1 = 0.9, x2 = 0.5;
  const z = w1 * x1 + w2 * x2 + b;
  const out = 1 / (1 + Math.exp(-z * 2.2));
  const edge = (w: number) => ({ stroke: w >= 0 ? C.amber : C.ember, strokeWidth: 1 + Math.abs(w) * 3.2, opacity: 0.35 + Math.min(0.65, Math.abs(w) * 0.4) });
  return (
    <div>
      <svg viewBox="0 0 420 190" className="w-full">
        <line x1={70} y1={52} x2={225} y2={95} {...edge(w1)} strokeLinecap="round" />
        <line x1={70} y1={138} x2={225} y2={95} {...edge(w2)} strokeLinecap="round" />
        <line x1={255} y1={95} x2={360} y2={95} stroke={C.amber} strokeWidth={1 + out * 5} opacity={0.2 + out * 0.8} strokeLinecap="round" />
        {[{ y: 52, x: x1, n: 'x₁' }, { y: 138, x: x2, n: 'x₂' }].map((i) => (
          <g key={i.n}>
            <circle cx={52} cy={i.y} r={20} fill="#13151a" stroke={C.faint} />
            <text x={52} y={i.y + 4} textAnchor="middle" fontSize={12} fill={C.bone} fontFamily="JetBrains Mono">{i.x}</text>
            <text x={18} y={i.y + 4} textAnchor="middle" fontSize={11} fill={C.mute}>{i.n}</text>
          </g>
        ))}
        <text x={140} y={56} textAnchor="middle" fontSize={10.5} fill={C.dim} fontFamily="JetBrains Mono">× {w1.toFixed(1)}</text>
        <text x={140} y={140} textAnchor="middle" fontSize={10.5} fill={C.dim} fontFamily="JetBrains Mono">× {w2.toFixed(1)}</text>
        <circle cx={240} cy={95} r={34 + out * 10} fill={C.amber} opacity={out * 0.16} />
        <circle cx={240} cy={95} r={30} fill="#13151a" stroke={C.amber} strokeOpacity={0.3 + out * 0.7} strokeWidth={1.5} />
        <circle cx={240} cy={95} r={24 * out} fill={C.amber} opacity={0.25 + out * 0.75} />
        <text x={240} y={150} textAnchor="middle" fontSize={10.5} fill={C.mute} fontFamily="JetBrains Mono">Σ {z.toFixed(2)}</text>
        <text x={385} y={99} textAnchor="middle" fontSize={15} fill={C.bone} fontFamily="JetBrains Mono">{out.toFixed(2)}</text>
        <text x={385} y={118} textAnchor="middle" fontSize={10} fill={out > 0.5 ? C.amber : C.mute}>{out > 0.5 ? 'fires' : 'quiet'}</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        <Slider label="Weight 1" value={w1} min={-2} max={2} step={0.1} onChange={setW1} format={(v) => v.toFixed(1)} />
        <Slider label="Weight 2" value={w2} min={-2} max={2} step={0.1} onChange={setW2} format={(v) => v.toFixed(1)} />
        <Slider label="Bias" value={b} min={-2} max={2} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
      </div>
    </div>
  );
}

/* -------------------------------- network ------------------------------- */

const LAYERS = [3, 5, 5, 2];
const FEATURES = ['curved edges', 'the word "not"', 'past tense', 'a question is being asked', 'code indentation', 'French text', 'numbers increasing', 'a name of a city', 'sarcasm', 'the Golden Gate Bridge'];

export function NetworkViz({ variant }: { variant?: string }) {
  const backward = variant === 'backward';
  const inspect = variant === 'inspect';
  const t = useClock(!inspect);
  const [seed, setSeed] = useState(3);
  const [picked, setPicked] = useState<string | null>(inspect ? '1-2' : null);
  const W = 420, H = 210;
  const nodes = useMemo(() => LAYERS.map((n, l) => Array.from({ length: n }, (_, i) => ({ x: 50 + l * ((W - 100) / (LAYERS.length - 1)), y: H / 2 + (i - (n - 1) / 2) * 38, l, i }))), []);
  const act = useMemo(() => { const r = seeded(seed * 97); return LAYERS.map((n) => Array.from({ length: n }, () => 0.15 + r() * 0.85)); }, [seed]);
  const wts = useMemo(() => { const r = seeded(seed * 31 + 5); return LAYERS.slice(0, -1).map((n, l) => Array.from({ length: n * LAYERS[l + 1] }, () => r())); }, [seed]);
  const cycle = 3.6;
  const phase = ((t % cycle) / cycle) * (LAYERS.length - 1 + 0.6); // 0..3.6 across layer gaps
  const pos = backward ? LAYERS.length - 1 - phase : phase;
  const color = backward ? C.ember : C.amber;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {nodes.slice(0, -1).map((layer, l) => layer.map((a) => nodes[l + 1].map((b) => {
          const w = wts[l][a.i * LAYERS[l + 1] + b.i];
          const gapPos = backward ? pos - l : pos - l; // progress through this gap, 0..1 when active
          const on = gapPos > 0 && gapPos < 1;
          const f = backward ? 1 - gapPos : gapPos;
          const hl = inspect && picked && (`${a.l}-${a.i}` === picked || `${b.l}-${b.i}` === picked);
          return (
            <g key={`${l}-${a.i}-${b.i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hl ? C.ion : C.bone} strokeWidth={hl ? 1.2 : 0.6} opacity={hl ? 0.2 + w * 0.7 : 0.05 + w * 0.12} />
              {!inspect && on && w > 0.35 && (
                <circle cx={a.x + (b.x - a.x) * (backward ? 1 - f : f)} cy={a.y + (b.y - a.y) * (backward ? 1 - f : f)} r={1.2 + w * 1.6} fill={color} opacity={0.5 + w * 0.5} />
              )}
            </g>
          );
        })))}
        {nodes.flat().map((n) => {
          const reached = inspect ? 1 : backward ? clamp(n.l - pos + 0.25, 0, 1) > 0 ? clamp((n.l - pos + 0.3) * 3) : 0 : clamp((pos - n.l + 0.3) * 3);
          const a = act[n.l][n.i] * reached;
          const id = `${n.l}-${n.i}`;
          const hidden = n.l > 0 && n.l < LAYERS.length - 1;
          const sel = picked === id;
          return (
            <g key={id} onClick={inspect && hidden ? () => setPicked(id) : undefined} style={{ cursor: inspect && hidden ? 'pointer' : 'default' }}>
              <circle cx={n.x} cy={n.y} r={13} fill={inspect ? C.ion : color} opacity={(sel ? 0.35 : a * 0.22)} />
              <circle cx={n.x} cy={n.y} r={8.5} fill="#13151a" stroke={sel ? C.ion : inspect ? C.faint : color} strokeOpacity={sel ? 1 : inspect ? 1 : 0.25 + a * 0.75} strokeWidth={sel ? 2 : 1.2} />
              <circle cx={n.x} cy={n.y} r={6 * (inspect ? act[n.l][n.i] : a)} fill={inspect ? (sel ? C.ion : C.dim) : color} opacity={0.9} />
            </g>
          );
        })}
        {['Input', 'Hidden', 'Hidden', 'Output'].map((s, i) => <text key={i} x={nodes[i][0].x} y={H - 4} textAnchor="middle" fontSize={9.5} fill={C.mute} fontFamily="JetBrains Mono" letterSpacing={1.2}>{s.toUpperCase()}</text>)}
      </svg>
      {inspect ? (
        <div className="mt-2 rounded-[10px] border border-hair px-3.5 py-3 text-[13px] text-bone-dim">
          {picked ? <>This unit responds most to: <span className="text-ion">{FEATURES[(Number(picked[0]) * 5 + Number(picked[2])) % FEATURES.length]}</span>. In a real model a single neuron usually mixes several such features, which is why researchers untangle them first.</> : 'Click a hidden unit.'}
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-bone-mute">{backward ? 'Error flows backwards; each weight learns its share of the blame.' : 'Each layer re-describes the one before it.'}</span>
          <button className="btn-ghost !h-8 shrink-0 !text-[12px]" onClick={() => setSeed((s) => s + 1)}>New input</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ activation ------------------------------ */

const ACTS: Record<string, { f: (x: number) => number; d: (x: number) => number; note: string }> = {
  ReLU: { f: (x) => Math.max(0, x), d: (x) => (x > 0 ? 1 : 0), note: 'Zero gradient for negatives, full gradient for positives.' },
  Sigmoid: { f: (x) => 1 / (1 + Math.exp(-x)), d: (x) => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }, note: 'Flat at both ends: the gradient vanishes.' },
  Tanh: { f: Math.tanh, d: (x) => 1 - Math.tanh(x) ** 2, note: 'Centred on zero, still flat at the extremes.' },
  GELU: { f: (x) => 0.5 * x * (1 + Math.tanh(0.7979 * (x + 0.0447 * x ** 3))), d: (x) => { const h = 0.001; const g = ACTS.GELU.f; return (g(x + h) - g(x - h)) / (2 * h); }, note: 'A smooth ReLU; the default inside transformers.' },
};

export function ActivationViz() {
  const [name, setName] = useState('ReLU');
  const [x, setX] = useState(1.2);
  const a = ACTS[name];
  const W = 420, H = 200, sx = (v: number) => 30 + ((v + 4) / 8) * (W - 60), sy = (v: number) => H / 2 + 30 - v * 38;
  const path = Array.from({ length: 121 }, (_, i) => { const v = -4 + (i / 120) * 8; return `${i ? 'L' : 'M'}${sx(v).toFixed(1)},${sy(a.f(v)).toFixed(1)}`; }).join('');
  const grad = a.d(x);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {Object.keys(ACTS).map((k) => <button key={k} onClick={() => setName(k)} aria-pressed={name === k} className={`chip !h-7 transition-colors ${name === k ? '!border-amber/60 bg-amber/10 !text-bone' : 'hover:!text-bone'}`}>{k}</button>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={30} x2={W - 30} y1={sy(0)} y2={sy(0)} stroke={C.faint} />
        <line x1={sx(0)} x2={sx(0)} y1={10} y2={H - 10} stroke={C.faint} />
        {[-4, -2, 2, 4].map((v) => <text key={v} x={sx(v)} y={sy(0) + 14} textAnchor="middle" fontSize={9.5} fill={C.mute} fontFamily="JetBrains Mono">{v}</text>)}
        <path d={path} fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round" />
        <line x1={sx(x) - 34} y1={sy(a.f(x)) + grad * 34 * (38 / ((W - 60) / 8))} x2={sx(x) + 34} y2={sy(a.f(x)) - grad * 34 * (38 / ((W - 60) / 8))} stroke={C.ion} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={sx(x)} cy={sy(a.f(x))} r={5.5} fill={C.amber} stroke="#0e1014" strokeWidth={2} />
      </svg>
      <Slider label="Input x" value={x} min={-4} max={4} step={0.1} onChange={setX} format={(v) => v.toFixed(1)} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Readout k="Output f(x)" v={a.f(x).toFixed(3)} />
        <Readout k="Gradient (slope)" v={grad.toFixed(3)} tone={Math.abs(grad) < 0.05 ? C.ember : C.ion} />
      </div>
      <p className="mt-2 text-[12.5px] text-bone-mute">{a.note} {Math.abs(grad) < 0.05 && <span className="text-ember">Here the slope is almost zero, so no learning signal passes through.</span>}</p>
    </div>
  );
}

/* ------------------------------- loss fit -------------------------------- */

const PTS = [[0.5, 1.5], [1.2, 1.4], [2, 2.6], [2.8, 2.5], [3.5, 3.4], [4.3, 3.3], [5, 4.4], [5.8, 4.3]];

export function LossFitViz() {
  const [m, setM] = useState(0.1);
  const [b, setB] = useState(3);
  const W = 420, H = 210, sx = (v: number) => 34 + (v / 6.5) * (W - 54), sy = (v: number) => H - 22 - (v / 6) * (H - 36);
  const mse = PTS.reduce((a, [x, y]) => a + (y - (m * x + b)) ** 2, 0) / PTS.length;
  const good = mse < 0.12;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={34} x2={W - 20} y1={sy(0)} y2={sy(0)} stroke={C.faint} /><line x1={34} x2={34} y1={10} y2={sy(0)} stroke={C.faint} />
        {PTS.map(([x, y], i) => <line key={i} x1={sx(x)} x2={sx(x)} y1={sy(y)} y2={sy(clamp(m * x + b, -1, 7))} stroke={C.ember} strokeWidth={2} opacity={0.75} strokeLinecap="round" />)}
        <line x1={sx(0)} y1={sy(b)} x2={sx(6.5)} y2={sy(m * 6.5 + b)} stroke={good ? C.ion : C.amber} strokeWidth={2} strokeLinecap="round" />
        {PTS.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={4.5} fill={C.bone} stroke="#0e1014" strokeWidth={2} />)}
      </svg>
      <div className="flex flex-wrap gap-4">
        <Slider label="Slope" value={m} min={-0.5} max={1.5} step={0.02} onChange={setM} />
        <Slider label="Intercept" value={b} min={-1} max={4} step={0.05} onChange={setB} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Readout k="Loss (MSE)" v={mse.toFixed(3)} tone={good ? C.ion : mse > 1 ? C.ember : C.amber} />
        <p className="flex-1 text-[12.5px] text-bone-mute">{good ? <span className="text-ion">That is close to the best possible line. Gradient descent finds this automatically.</span> : 'Shrink the red bars. You are doing by hand what training does by calculus.'}</p>
      </div>
    </div>
  );
}

/* -------------------------------- poly fit ------------------------------- */

function polyfit(xs: number[], ys: number[], deg: number): number[] {
  const n = deg + 1;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => j < n ? xs.reduce((a, x) => a + x ** (i + j), 0) + (i === j ? 1e-7 : 0) : xs.reduce((a, x, k) => a + ys[k] * x ** i, 0)));
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c2 = i; c2 <= n; c2++) A[r][c2] -= f * A[i][c2]; }
  }
  return A.map((row, i) => row[n] / row[i]);
}

export function PolyFitViz() {
  const [deg, setDeg] = useState(1);
  const data = useMemo(() => {
    const r = seeded(42);
    const truth = (x: number) => Math.sin(x * 2.6) * 0.55 + x * 0.25;
    const mk = (n: number) => Array.from({ length: n }, () => { const x = -1 + r() * 2; return [x, truth(x) + (r() - 0.5) * 0.5]; });
    return { train: mk(11), test: mk(11) };
  }, []);
  const coef = useMemo(() => polyfit(data.train.map((p) => p[0]), data.train.map((p) => p[1]), deg), [data, deg]);
  const f = (x: number) => coef.reduce((a, k, i) => a + k * x ** i, 0);
  const err = (pts: number[][]) => pts.reduce((a, [x, y]) => a + (y - f(x)) ** 2, 0) / pts.length;
  const W = 420, H = 210, sx = (v: number) => 20 + ((v + 1.05) / 2.1) * (W - 40), sy = (v: number) => H / 2 - v * 78;
  const path = Array.from({ length: 141 }, (_, i) => { const x = -1.05 + (i / 140) * 2.1; return `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${clamp(sy(f(x)), -40, H + 40).toFixed(1)}`; }).join('');
  const tr = err(data.train), te = err(data.test);
  const verdict = deg <= 1 ? ['Underfitting', 'Too rigid to follow the trend.', C.amber] : deg <= 4 ? ['Good fit', 'Captures the trend, ignores the noise.', C.ion] : ['Overfitting', 'Bends to hit every training point, and misses the unseen ones.', C.ember];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'hidden' }}>
        <line x1={20} x2={W - 20} y1={sy(0)} y2={sy(0)} stroke={C.grid} />
        <path d={path} fill="none" stroke={verdict[2]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.test.map(([x, y], i) => <circle key={`t${i}`} cx={sx(x)} cy={sy(y)} r={4} fill="none" stroke={C.dim} strokeWidth={1.4} />)}
        {data.train.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={4.5} fill={C.bone} stroke="#0e1014" strokeWidth={2} />)}
      </svg>
      <div className="mb-2 flex gap-4 text-[11.5px] text-bone-mute">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bone" />Training data</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-bone-dim" />Held-out data</span>
      </div>
      <Slider label="Model flexibility (polynomial degree)" value={deg} min={1} max={9} step={1} onChange={setDeg} format={(v) => String(v)} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Readout k="Training error" v={tr.toFixed(3)} />
        <Readout k="Held-out error" v={te.toFixed(3)} tone={te > tr * 2.5 ? C.ember : C.bone} />
      </div>
      <p className="mt-2 text-[12.5px] text-bone-mute"><span style={{ color: verdict[2] }}>{verdict[0]}.</span> {verdict[1]}</p>
    </div>
  );
}

/* ------------------------------- tokenizer ------------------------------- */

const WHOLE = new Set('the a an of to and in is it you that he was for on are as with his they i at be this have from or one had by word but not what all were we when your can said there use each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see no way could people my than first water been call who its now find long down day did get come made may part ai model models learn learning neural network data train training text token tokens attention language deep think know work very much good new'.split(' '));
const PIECES = ['ization', 'ation', 'ition', 'ment', 'ness', 'able', 'ible', 'ings', 'ing', 'tion', 'sion', 'ious', 'ous', 'ful', 'less', 'ity', 'ism', 'ist', 'ize', 'ise', 'est', 'ers', 'ed', 'er', 'ly', 'al', 'es', 's'];
const PREFIX = ['trans', 'inter', 'under', 'super', 'anti', 'over', 'pre', 'un', 're', 'dis', 'mis', 'non'];

function tokenizeWord(w: string): string[] {
  const lower = w.toLowerCase();
  if (WHOLE.has(lower) || w.length <= 3) return [w];
  const out: string[] = [];
  let rest = w;
  const pre = PREFIX.find((p) => lower.startsWith(p) && w.length > p.length + 3);
  if (pre) { out.push(rest.slice(0, pre.length)); rest = rest.slice(pre.length); }
  const tail: string[] = [];
  for (let guard = 0; guard < 2; guard++) {
    const suf = PIECES.find((s) => rest.toLowerCase().endsWith(s) && rest.length > s.length + 2);
    if (!suf) break;
    tail.unshift(rest.slice(-suf.length));
    rest = rest.slice(0, -suf.length);
  }
  while (rest.length > 5) { out.push(rest.slice(0, 4)); rest = rest.slice(4); }
  if (rest) out.push(rest);
  return [...out, ...tail];
}

const TOK_COLORS = ['rgba(255,180,84,0.2)', 'rgba(95,212,196,0.18)', 'rgba(255,107,94,0.18)', 'rgba(143,168,255,0.2)'];

export function TokenizerViz() {
  const [text, setText] = useState('Tokenization makes unbelievably long words manageable.');
  const tokens = useMemo(() => {
    const out: string[] = [];
    (text.match(/[A-Za-zÀ-ž']+|\d+|[^\sA-Za-zÀ-ž\d]/g) ?? []).forEach((piece) => {
      if (/^[A-Za-zÀ-ž']+$/.test(piece)) out.push(...tokenizeWord(piece));
      else if (/^\d+$/.test(piece)) out.push(...(piece.match(/.{1,3}/g) ?? []));
      else out.push(piece);
    });
    return out;
  }, [text]);
  return (
    <div>
      <textarea className="field" rows={2} value={text} onChange={(e) => setText(e.target.value.slice(0, 180))} aria-label="Text to tokenize" placeholder="Type something" />
      <div className="mt-3 flex min-h-[72px] flex-wrap content-start gap-1 rounded-[10px] border border-hair p-3">
        {tokens.length === 0 ? <span className="text-[13px] text-bone-faint">Tokens appear here.</span> : tokens.map((t, i) => (
          <span key={i} className="num rounded-[5px] px-1.5 py-0.5 text-[13px] text-bone" style={{ background: TOK_COLORS[i % 4] }}>{t}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Readout k="Characters" v={text.length} /><Readout k="Tokens" v={tokens.length} tone={C.amber} /><Readout k="Chars / token" v={tokens.length ? (text.replace(/\s/g, '').length / tokens.length).toFixed(1) : '0'} />
      </div>
      <p className="mt-2 text-[12px] text-bone-faint">A simplified tokenizer for illustration. Real ones learn their pieces from data, but split in the same spirit.</p>
    </div>
  );
}

/* ------------------------------ positional ------------------------------ */

export function PositionalViz() {
  const ROWS = 14, COLS = 24;
  const [row, setRow] = useState<number | null>(3);
  const val = (pos: number, i: number) => { const ang = pos / Math.pow(60, (2 * Math.floor(i / 2)) / COLS); return i % 2 === 0 ? Math.sin(ang) : Math.cos(ang); };
  // diverging: ion for negative, amber for positive, neutral dark at zero
  const color = (v: number) => (v >= 0 ? `rgba(255,180,84,${0.06 + v * 0.9})` : `rgba(95,212,196,${0.06 - v * 0.9})`);
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-[1px]">{[0, ROWS - 1].map((r) => <span key={r} className="label !text-[9px]">pos {r}</span>)}</div>
        <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} onMouseLeave={() => setRow(3)}>
          {Array.from({ length: ROWS * COLS }, (_, k) => {
            const r = Math.floor(k / COLS), c2 = k % COLS;
            return <span key={k} onMouseEnter={() => setRow(r)} onClick={() => setRow(r)} className="aspect-square rounded-[2px] transition-opacity" style={{ background: color(val(r, c2)), opacity: row === null || row === r ? 1 : 0.4 }} />;
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-bone-mute">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: C.ion }} />−1<span className="mx-1 h-2 w-2 rounded-[2px] bg-white/10" />0<span className="ml-1 h-2 w-2 rounded-[2px]" style={{ background: C.amber }} />+1</span>
        <span className="label">fast dimensions → slow dimensions</span>
      </div>
      <p className="mt-2 text-[12.5px] text-bone-mute">Position <span className="num text-amber">{row ?? 0}</span> has its own pattern across all dimensions. Left columns flip quickly, right columns barely move: together they work like the hands of a clock.</p>
    </div>
  );
}
