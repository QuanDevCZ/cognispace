import { useEffect, useMemo, useRef, useState } from 'react';
import { C, Readout, Slider, clamp, lerp, seeded, smooth, softmax } from './shared';

/* ------------------------------- attention ------------------------------- */

const TOKENS = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'];
type Row = Record<number, number>;
const HEADS: { name: string; blurb: string; rows: Record<number, Row>; fallback: (i: number) => Row }[] = [
  {
    name: 'Reference', blurb: 'Links words to what they refer to.',
    rows: { 7: { 1: 0.6, 10: 0.16, 5: 0.1, 7: 0.06 }, 10: { 1: 0.42, 7: 0.3, 8: 0.12 }, 2: { 3: 0.5, 1: 0.26 }, 3: { 5: 0.44, 1: 0.3, 2: 0.1 }, 8: { 7: 0.5, 10: 0.3 }, 5: { 3: 0.5, 4: 0.25 }, 1: { 0: 0.3, 1: 0.4, 3: 0.15 } },
    fallback: (i) => ({ [i]: 0.4, [i - 1]: 0.25, [i + 1]: 0.18 }),
  },
  { name: 'Previous word', blurb: 'Simply looks one step back. Models really do learn heads like this.', rows: {}, fallback: (i) => (i === 0 ? { 0: 0.9 } : { [i - 1]: 0.82, [i]: 0.12 }) },
  {
    name: 'Subject and verb', blurb: 'Connects who is doing with what is being done.',
    rows: { 1: { 3: 0.6, 2: 0.22 }, 3: { 1: 0.62, 2: 0.2 }, 2: { 1: 0.45, 3: 0.4 }, 7: { 8: 0.66, 10: 0.14 }, 8: { 7: 0.66, 10: 0.2 }, 10: { 8: 0.5, 7: 0.3 } },
    fallback: (i) => ({ [i]: 0.6 }),
  },
];

function weights(head: number, i: number): number[] {
  const h = HEADS[head];
  const row = h.rows[i] ?? h.fallback(i);
  const raw = TOKENS.map((_, j) => (row[j] ?? 0) + 0.012);
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / s);
}

export function AttentionViz({ variant }: { variant?: string }) {
  const multi = variant === 'heads';
  const [head, setHead] = useState(0);
  const [sel, setSel] = useState(7);
  const w = weights(multi ? head : 0, sel);
  const layout = useMemo(() => {
    let x = 6;
    return TOKENS.map((t) => { const wd = t.length * 6.3 + 13; const o = { x, w: wd, cx: x + wd / 2 }; x += wd + 4; return o; });
  }, []);
  const W = layout[layout.length - 1].x + layout[layout.length - 1].w + 6, base = 132;
  const top3 = [...w.map((v, i) => [v, i])].sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
  return (
    <div>
      {multi && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {HEADS.map((h, i) => <button key={h.name} onClick={() => setHead(i)} aria-pressed={head === i} className={`chip !h-7 transition-colors ${head === i ? '!border-amber/60 bg-amber/10 !text-bone' : 'hover:!text-bone'}`}>Head {i + 1}: {h.name}</button>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} 176`} className="w-full">
        {TOKENS.map((_, j) => {
          if (j === sel || w[j] < 0.03) return null;
          const a = layout[sel].cx, b = layout[j].cx;
          const hgt = Math.min(118, 26 + Math.abs(a - b) * 0.42);
          return <path key={j} d={`M${a},${base} Q${(a + b) / 2},${base - hgt * 1.7} ${b},${base}`} fill="none" stroke={C.amber} strokeWidth={0.6 + w[j] * 9} opacity={0.2 + w[j] * 0.8} strokeLinecap="round" style={{ transition: 'all .35s' }} />;
        })}
        {TOKENS.map((t, j) => (
          <g key={j} onClick={() => setSel(j)} style={{ cursor: 'pointer' }}>
            <rect x={layout[j].x} y={base + 4} width={layout[j].w} height={24} rx={6} fill={C.amber} opacity={j === sel ? 0 : w[j] * 0.75} style={{ transition: 'opacity .35s' }} />
            <rect x={layout[j].x} y={base + 4} width={layout[j].w} height={24} rx={6} fill="none" stroke={j === sel ? C.bone : C.faint} strokeWidth={j === sel ? 1.5 : 1} />
            <text x={layout[j].cx} y={base + 20} textAnchor="middle" fontSize={10.5} fill={C.bone} fontFamily="JetBrains Mono">{t}</text>
            {j !== sel && top3.includes(j) && <text x={layout[j].cx} y={base + 41} textAnchor="middle" fontSize={9.5} fill={C.amber} fontFamily="JetBrains Mono">{Math.round(w[j] * 100)}%</text>}
          </g>
        ))}
      </svg>
      <p className="text-[12.5px] text-bone-mute">
        <span className="text-bone">&ldquo;{TOKENS[sel]}&rdquo;</span> attends most to <span className="text-amber">&ldquo;{TOKENS[top3.find((i) => i !== sel) ?? top3[0]]}&rdquo;</span>.
        {multi ? ` ${HEADS[head].blurb}` : sel === 7 ? ' That is how the model knows what "it" means.' : ' Click another word.'}
      </p>
    </div>
  );
}

/* -------------------------------- stepper -------------------------------- */

const STEPS: Record<string, { t: string; d: string; data: string }[]> = {
  block: [
    { t: 'Token in', d: 'A token arrives as a vector: its embedding plus its position.', data: 'x = [0.12, −0.83, 0.40, …]' },
    { t: 'Attention', d: 'It looks across all other tokens and gathers what is relevant to it.', data: 'a = Σ weightᵢ · valueᵢ' },
    { t: 'Add', d: 'The gathered information is added to the original vector, not swapped for it. This is the residual shortcut.', data: 'x ← x + a' },
    { t: 'Feed-forward', d: 'A small network processes each token on its own. Much factual knowledge appears to live in these layers.', data: 'f = MLP(x)' },
    { t: 'Add', d: 'Added back onto the stream again. Each block only writes a correction.', data: 'x ← x + f' },
    { t: 'Next block', d: 'The enriched vector moves to the next block. Repeat a few dozen times.', data: 'x → block n+1' },
  ],
  rag: [
    { t: 'Question', d: 'A user asks something the model was never trained on.', data: '"What changed in our refund policy?"' },
    { t: 'Embed', d: 'The question is turned into a vector with an embedding model.', data: 'q = [0.31, −0.07, 0.92, …]' },
    { t: 'Search', d: 'The nearest document chunks in vector space are found.', data: 'top 3 of 48,112 chunks' },
    { t: 'Augment', d: 'Those chunks are pasted into the context window, above the question.', data: 'context = chunks + question' },
    { t: 'Generate', d: 'The model answers from the text in front of it, and can cite it.', data: '"Refunds now take 14 days [policy.pdf]"' },
  ],
  agent: [
    { t: 'Goal', d: 'The model is given a task and a list of tools it may call.', data: '"Fix the failing test"' },
    { t: 'Think', d: 'It reasons about what it knows and decides on the next action.', data: '"I should read the test output first."' },
    { t: 'Act', d: 'It emits a structured tool call. The surrounding program runs it.', data: 'run_tests({ file: "auth.test.ts" })' },
    { t: 'Observe', d: 'The result is appended to the context. Now it knows something new.', data: '1 failed: expected 200, got 401' },
    { t: 'Loop', d: 'With the new information it thinks again. This repeats until it judges the goal met.', data: '→ back to Think' },
  ],
};

export function StepperViz({ variant = 'block' }: { variant?: string }) {
  const steps = STEPS[variant] ?? STEPS.block;
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div>
      <ol className="flex items-start">
        {steps.map((st, k) => (
          <li key={k} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-px flex-1 transition-colors duration-300 ${k === 0 ? 'opacity-0' : ''} ${k <= i ? 'bg-amber' : 'bg-white/15'}`} />
              <button onClick={() => setI(k)} aria-label={`Step ${k + 1}: ${st.t}`} aria-current={k === i}
                className={`num grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] transition-all duration-300 ${k === i ? 'scale-110 border-amber bg-amber text-ink-950 shadow-glow' : k < i ? 'border-amber/60 text-amber' : 'border-hair text-bone-mute hover:text-bone'}`}>{k + 1}</button>
              <span className={`h-px flex-1 transition-colors duration-300 ${k === steps.length - 1 ? 'opacity-0' : ''} ${k < i ? 'bg-amber' : 'bg-white/15'}`} />
            </div>
            <span className={`mt-2 w-full truncate px-0.5 text-center text-[10px] transition-colors ${k === i ? 'text-bone' : 'text-bone-mute'}`}>{st.t}</span>
          </li>
        ))}
      </ol>
      <div key={i} className="mt-4 rounded-[10px] border border-hair p-4" style={{ animation: 'vizfade .35s ease both' }}>
        <style>{'@keyframes vizfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
        <p className="text-[13.5px] leading-relaxed text-bone">{s.d}</p>
        <p className="num mt-2.5 rounded-[7px] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ion">{s.data}</p>
      </div>
      <div className="mt-3 flex justify-between">
        <button className="btn-ghost !h-8 !text-[12px]" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
        <button className="btn-ghost !h-8 !text-[12px]" onClick={() => setI(i === steps.length - 1 ? 0 : i + 1)}>{i === steps.length - 1 ? 'Start over' : 'Next step'}</button>
      </div>
    </div>
  );
}

/* ----------------------------- context window ---------------------------- */

const CHAT: { who: 'You' | 'Model'; text: string; n: number }[] = [
  { who: 'You', text: 'Hi, my name is Ada and I am learning about transformers.', n: 14 },
  { who: 'Model', text: 'Nice to meet you, Ada. Where shall we start?', n: 12 },
  { who: 'You', text: 'Explain attention like I am twelve.', n: 9 },
  { who: 'Model', text: 'Imagine every word can glance at every other word and decide who matters.', n: 18 },
  { who: 'You', text: 'And what is a token?', n: 7 },
  { who: 'Model', text: 'A chunk of text, often just part of a word.', n: 12 },
  { who: 'You', text: 'By the way, what is my name?', n: 9 },
];

export function ContextViz() {
  const total = CHAT.reduce((a, m) => a + m.n, 0);
  const [win, setWin] = useState(total);
  let used = 0;
  const visible = CHAT.map(() => false);
  for (let k = CHAT.length - 1; k >= 0; k--) { if (used + CHAT[k].n <= win) { used += CHAT[k].n; visible[k] = true; } else break; }
  const knows = visible[0];
  return (
    <div>
      <ul className="space-y-1.5">
        {CHAT.map((m, k) => (
          <li key={k} className={`flex gap-2.5 rounded-[9px] border px-3 py-1.5 text-[12.5px] transition-all duration-300 ${visible[k] ? 'border-hair text-bone-dim' : 'border-transparent text-bone-faint line-through opacity-50'}`}>
            <span className={`label w-11 shrink-0 pt-[3px] ${m.who === 'You' ? '!text-amber' : '!text-ion'} ${visible[k] ? '' : '!text-bone-faint'}`}>{m.who}</span>
            <span className="flex-1">{m.text}</span><span className="num shrink-0 text-[10.5px] text-bone-faint">{m.n}</span>
          </li>
        ))}
        <li className={`flex gap-2.5 rounded-[9px] border px-3 py-2 text-[13px] ${knows ? 'border-ion/40 bg-ion/[0.06] text-bone' : 'border-ember/40 bg-ember/[0.06] text-bone'}`}>
          <span className="label w-11 shrink-0 pt-[3px] !text-ion">Model</span>
          <span>{knows ? 'Your name is Ada.' : 'I do not see your name anywhere in our conversation.'}</span>
        </li>
      </ul>
      <div className="mt-3"><Slider label="Context window (tokens)" value={win} min={20} max={total} step={1} onChange={setWin} format={(v) => `${used} used / ${v}`} /></div>
      <p className="mt-1 text-[12.5px] text-bone-mute">{knows ? 'Everything fits, so the first message is still visible.' : <span className="text-ember">The oldest messages fell out of the window. For the model, they never happened.</span>}</p>
    </div>
  );
}

/* ------------------------------- next token ------------------------------ */

const NEXT: Record<string, [string, number][]> = {
  the: [['mat', 0.44], ['sofa', 0.2], ['floor', 0.16], ['roof', 0.12], ['moon', 0.08]],
  mat: [['and', 0.42], ['.', 0.3], ['while', 0.17], ['because', 0.11]],
  sofa: [['and', 0.4], ['.', 0.34], ['all', 0.14], ['until', 0.12]],
  floor: [['.', 0.4], ['and', 0.33], ['because', 0.15], ['beside', 0.12]],
  roof: [['and', 0.36], ['watching', 0.3], ['.', 0.22], ['until', 0.12]],
  moon: [['?', 0.4], ['in', 0.25], ['.', 0.2], ['and', 0.15]],
  and: [['purred', 0.4], ['fell', 0.24], ['watched', 0.2], ['waited', 0.16]],
  purred: [['softly', 0.5], ['.', 0.3], ['until', 0.2]],
  fell: [['asleep', 0.86], ['over', 0.09], ['silent', 0.05]],
  watched: [['the', 0.62], ['birds', 0.24], ['quietly', 0.14]],
  because: [['it', 0.6], ['the', 0.25], ['nobody', 0.15]],
  it: [['was', 0.7], ['liked', 0.2], ['could', 0.1]],
  was: [['tired', 0.45], ['warm', 0.35], ['there', 0.2]],
};
const NEXT_FALLBACK: [string, number][] = [['.', 0.5], ['and', 0.28], ['quietly', 0.12], ['again', 0.1]];
const START = ['The', 'cat', 'sat', 'on', 'the'];

export function NextTokenViz() {
  const [seq, setSeq] = useState<string[]>(START);
  const last = seq[seq.length - 1].toLowerCase();
  const ended = last === '.' || last === '?' || seq.length > 16;
  const opts = NEXT[last] ?? NEXT_FALLBACK;
  return (
    <div>
      <div className="min-h-[58px] rounded-[10px] border border-hair p-3 font-display text-[21px] leading-snug text-bone">
        {seq.map((w, i) => <span key={i} className={i >= START.length ? 'text-amber' : ''}>{/^[.?]$/.test(w) ? w : ` ${w}`}</span>)}
        {!ended && <span className="ml-1 inline-block h-5 w-[2px] translate-y-1 animate-pulseSoft bg-amber" />}
      </div>
      {ended ? (
        <p className="mt-3 text-[12.5px] text-bone-mute">A sentence, one token at a time. Every word was a draw from a probability distribution.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {opts.map(([tok, p]) => (
            <li key={tok}>
              <button onClick={() => setSeq([...seq, tok])} className="group relative flex h-9 w-full items-center overflow-hidden rounded-[8px] border border-hair px-3 text-left transition-colors hover:border-amber/50">
                <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-amber/20 transition-all duration-500 group-hover:bg-amber/35" style={{ width: `${p * 100}%` }} />
                <span className="num relative flex-1 text-[13px] text-bone">{tok}</span>
                <span className="num relative text-[12px] text-bone-dim">{Math.round(p * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-between gap-2">
        <button className="btn-ghost !h-8 !text-[12px]" onClick={() => setSeq(START)} disabled={seq.length === START.length}>Reset</button>
        {!ended && <button className="btn-ghost !h-8 !text-[12px]" onClick={() => { let r = Math.random(), pick = opts[0][0]; for (const [tok, p] of opts) { if ((r -= p) <= 0) { pick = tok; break; } } setSeq([...seq, pick]); }}>Sample for me</button>}
      </div>
    </div>
  );
}

/* ---------------------------- probability bars ---------------------------- */

interface BarCfg { prompt: string; labels: string[]; slider: { label: string; min: number; max: number; step: number; init: number; format: (v: number) => string }; probs: (v: number) => number[]; note: (v: number, p: number[]) => string; good?: number; sample?: boolean }

const BARS: Record<string, BarCfg> = {
  temperature: {
    prompt: 'The sky at dusk turned …', labels: ['orange', 'pink', 'dark', 'violet', 'electric', 'sideways'], sample: true,
    slider: { label: 'Temperature', min: 0.1, max: 2, step: 0.05, init: 0.8, format: (v) => v.toFixed(2) },
    probs: (T) => softmax([3.2, 2.5, 2.1, 1.4, 0.2, -1.2], T),
    note: (T) => (T < 0.4 ? 'Cold: the favourite wins nearly every time. Safe, and repetitive.' : T < 1.2 ? 'Balanced: mostly sensible, occasionally surprising.' : 'Hot: unlikely words get real chances. Creative, then nonsense.'),
  },
  finetune: {
    prompt: 'Patient reports chest pain … next word:', labels: ['radiating', 'since', 'and', 'today', 'lol', 'which'], good: 0,
    slider: { label: 'Fine-tuning on clinical notes', min: 0, max: 1, step: 0.01, init: 0.1, format: (v) => `${Math.round(v * 100)}%` },
    probs: (v) => softmax([lerp(0.9, 3.4, v), lerp(0.8, 2.4, v), lerp(1.6, 1.0, v), lerp(1.3, 0.2, v), lerp(0.7, -3, v), lerp(1.1, 0.1, v)]),
    note: (v) => (v < 0.3 ? 'The generalist: any casual continuation is plausible.' : v < 0.8 ? 'Clinical phrasing is pulling ahead.' : 'A specialist. Sharp in its domain, and it has quietly lost its range.'),
  },
  rlhf: {
    prompt: 'Which kind of answer does the model give?', labels: ['Helpful, careful', 'Confident guess', 'Flattering agreement', 'Blunt and rude', 'Refuses for no reason'], good: 0,
    slider: { label: 'Strength of human feedback', min: 0, max: 1, step: 0.01, init: 0, format: (v) => `${Math.round(v * 100)}%` },
    probs: (v) => softmax([lerp(1, 3.6, v), lerp(1.2, 1.5, v), lerp(0.9, 2.3, v), lerp(1, -2, v), lerp(0.6, -0.4, v)]),
    note: (v) => (v < 0.3 ? 'The raw model has no preference between styles.' : 'Helpful answers win. But notice flattery rising too: raters like being agreed with, and the model learns that as well.'),
  },
  fewshot: {
    prompt: 'France → ?   (the wanted format is: PARIS)', labels: ['PARIS', 'Paris', 'The capital is Paris.', 'France is a country'], good: 0,
    slider: { label: 'Examples in the prompt', min: 0, max: 4, step: 1, init: 0, format: (v) => `${v} example${v === 1 ? '' : 's'}` },
    probs: (v) => softmax([0.2 + v * 1.5, 1.8 + v * 0.1, 2.0 - v * 0.5, 0.6 - v * 0.6]),
    note: (v) => (v === 0 ? 'With no examples the model gives a natural sentence. Reasonable, but not the format you wanted.' : v < 3 ? 'It is starting to infer the pattern: country in, capital out, upper case.' : 'Pattern locked in, with no change to the weights at all.'),
  },
  hallucination: {
    prompt: 'Who wrote the 1987 paper on tidal resonance?', labels: ['Dr. Okafor (true)', 'Dr. Lindqvist', 'Dr. Marchetti', 'Dr. Tanaka', '"I am not sure"'], good: 0,
    slider: { label: 'Times the fact appeared in training', min: 0, max: 1, step: 0.01, init: 1, format: (v) => (v > 0.75 ? 'thousands' : v > 0.4 ? 'hundreds' : v > 0.12 ? 'a handful' : 'never') },
    probs: (v) => softmax([lerp(1.0, 4.4, v), lerp(1.25, 0.6, v), lerp(1.1, 0.4, v), lerp(1.05, 0.3, v), lerp(0.5, -0.6, v)]),
    note: (v, p) => (p.indexOf(Math.max(...p)) === 0 ? 'A sharp peak on the true answer. The model "knows" this.' : 'No peak left, only plausible-sounding names. It will still pick one, and say it fluently.'),
  },
};

export function BarsViz({ variant = 'temperature' }: { variant?: string }) {
  const cfg = BARS[variant] ?? BARS.temperature;
  const [v, setV] = useState(cfg.slider.init);
  const [draws, setDraws] = useState<number[]>([]);
  const p = cfg.probs(v);
  const top = p.indexOf(Math.max(...p));
  const wrong = cfg.good !== undefined && top !== cfg.good;
  return (
    <div>
      <p className="mb-3 rounded-[9px] bg-white/[0.04] px-3 py-2 font-display text-[18px] italic text-bone">{cfg.prompt}</p>
      <ul className="space-y-1.5">
        {cfg.labels.map((l, i) => (
          <li key={l} className="grid grid-cols-[minmax(0,42%)_1fr_38px] items-center gap-2.5 text-[12.5px]">
            <span className={`truncate ${i === top ? 'text-bone' : 'text-bone-dim'}`}>{l}</span>
            <span className="h-[7px] overflow-hidden rounded-full bg-white/[0.06]">
              <span className="block h-full rounded-full transition-all duration-300" style={{ width: `${p[i] * 100}%`, background: cfg.good === undefined ? C.amber : i === cfg.good ? C.ion : i === top ? C.ember : C.amber }} />
            </span>
            <span className="num text-right text-bone-dim">{Math.round(p[i] * 100)}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-end gap-3">
        <Slider label={cfg.slider.label} value={v} min={cfg.slider.min} max={cfg.slider.max} step={cfg.slider.step} onChange={setV} format={cfg.slider.format} />
        {cfg.sample && <button className="btn-ghost !h-8 shrink-0 !text-[12px]" onClick={() => { let r = Math.random(), k = 0; for (let i = 0; i < p.length; i++) { if ((r -= p[i]) <= 0) { k = i; break; } } setDraws((d) => [...d.slice(-11), k]); }}>Sample</button>}
      </div>
      {cfg.sample && draws.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{draws.map((d, i) => <span key={i} className="chip !h-6">{cfg.labels[d]}</span>)}</div>}
      <p className={`mt-2 text-[12.5px] ${wrong ? 'text-ember' : 'text-bone-mute'}`}>{cfg.note(v, p)}</p>
    </div>
  );
}

/* -------------------------------- scaling -------------------------------- */

export function ScalingViz({ variant }: { variant?: string }) {
  const emergence = variant === 'emergence';
  const [s, setS] = useState(emergence ? 1.5 : 2);
  const W = 420, H = 210, m = { l: 40, r: 16, t: 14, b: 30 };
  const sx = (e: number) => m.l + (e / 6) * (W - m.l - m.r);
  const loss = (e: number) => 4.2 * Math.pow(10, -0.11 * e) + 0.4; // power law, plotted on a log x-axis
  const step = (e: number) => 0.55 + 0.445 * smooth(0, 6, e) ** 0.8; // accuracy per reasoning step
  const task = (e: number) => step(e) ** 12; // all 12 steps must be right
  const yMax = emergence ? 1 : 5;
  const sy = (v: number) => m.t + (1 - v / yMax) * (H - m.t - m.b);
  const curve = (f: (e: number) => number) => Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${sx(i / 10).toFixed(1)},${sy(f(i / 10)).toFixed(1)}`).join('');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={W - m.r} y1={sy(yMax * f)} y2={sy(yMax * f)} stroke={f === 0 ? C.faint : C.grid} /><text x={m.l - 7} y={sy(yMax * f) + 3.5} textAnchor="end" fontSize={9.5} fill={C.mute} fontFamily="JetBrains Mono">{emergence ? `${f * 100}%` : (yMax * f).toFixed(1)}</text></g>)}
        {[0, 2, 4, 6].map((e) => <text key={e} x={sx(e)} y={H - 10} textAnchor="middle" fontSize={9.5} fill={C.mute} fontFamily="JetBrains Mono">10{'⁰¹²³⁴⁵⁶'[e]}×</text>)}
        <line x1={sx(s)} x2={sx(s)} y1={m.t} y2={H - m.b} stroke={C.faint} strokeDasharray="2 4" />
        {emergence ? (
          <>
            <path d={curve(step)} fill="none" stroke={C.ion} strokeWidth={2} strokeLinecap="round" />
            <path d={curve(task)} fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round" />
            <circle cx={sx(s)} cy={sy(step(s))} r={4.5} fill={C.ion} stroke="#0e1014" strokeWidth={2} />
            <circle cx={sx(s)} cy={sy(task(s))} r={4.5} fill={C.amber} stroke="#0e1014" strokeWidth={2} />
            <text x={sx(0.15)} y={sy(step(0)) - 8} fontSize={10} fill={C.dim}>accuracy per step</text>
            <text x={sx(3.2)} y={sy(0.08)} fontSize={10} fill={C.dim}>12-step task solved</text>
          </>
        ) : (
          <>
            <path d={curve(loss)} fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round" />
            <circle cx={sx(s)} cy={sy(loss(s))} r={4.5} fill={C.amber} stroke="#0e1014" strokeWidth={2} />
          </>
        )}
      </svg>
      {emergence && (
        <div className="mb-2 flex gap-4 text-[11.5px] text-bone-mute">
          <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded" style={{ background: C.ion }} />Accuracy per step</span>
          <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded" style={{ background: C.amber }} />Whole task solved</span>
        </div>
      )}
      <Slider label="Scale (compute, data, parameters)" value={s} min={0} max={6} step={0.05} onChange={setS} format={(v) => `10^${v.toFixed(1)}×`} />
      {emergence ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2"><Readout k="Accuracy per step" v={`${(step(s) * 100).toFixed(1)}%`} tone={C.ion} /><Readout k="12-step task solved" v={`${(task(s) * 100).toFixed(1)}%`} tone={C.amber} /></div>
          <p className="mt-2 text-[12.5px] text-bone-mute">The underlying skill improves smoothly the whole way. The task needs twelve steps right in a row, so it looks like nothing is happening, then it switches on.</p>
        </>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2"><Readout k="Loss" v={loss(s).toFixed(2)} /><Readout k="Gain from the next 10×" v={`−${(loss(s) - loss(s + 1)).toFixed(2)}`} tone={C.ion} /></div>
          <p className="mt-2 text-[12.5px] text-bone-mute">Each tenfold step in scale buys a further, predictable drop. The curve keeps falling; it just costs ten times more each time.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------- diffusion ------------------------------- */

const N = 120;

export function DiffusionViz() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const STEPS_N = 40;
  const data = useMemo(() => {
    const img = new Float32Array(N * N * 3), blur = new Float32Array(N * N * 3), noise = new Float32Array(N * N * 3);
    const r = seeded(5);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = (y * N + x) * 3;
      let cr = lerp(0.06, 0.95, v ** 1.6), cg = lerp(0.07, 0.5, v ** 2), cb = lerp(0.2, 0.25, v);
      const ds = Math.hypot(u - 0.62, v - 0.56);
      if (ds < 0.13) { cr = 1; cg = 0.86; cb = 0.55; } else { const g = Math.exp(-ds * 7) * 0.5; cr += g; cg += g * 0.6; }
      const h1 = 0.74 + Math.sin(u * 5.2 + 0.6) * 0.07 + Math.sin(u * 13) * 0.015, h2 = 0.84 + Math.sin(u * 3.4 + 2.4) * 0.06;
      if (v > h1) { cr = 0.13; cg = 0.11; cb = 0.18; }
      if (v > h2) { cr = 0.05; cg = 0.05; cb = 0.09; }
      img[i] = clamp(cr); img[i + 1] = clamp(cg); img[i + 2] = clamp(cb);
      noise[i] = r(); noise[i + 1] = r(); noise[i + 2] = r();
    }
    const B = 12;
    for (let by = 0; by < N; by += B) for (let bx = 0; bx < N; bx += B) {
      const acc = [0, 0, 0];
      for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) for (let k = 0; k < 3; k++) acc[k] += img[(y * N + x) * 3 + k];
      for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) for (let k = 0; k < 3; k++) blur[(y * N + x) * 3 + k] = acc[k] / (B * B);
    }
    return { img, blur, noise };
  }, []);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const s = step / STEPS_N;
    const d1 = smooth(0, 0.75, s), d2 = smooth(0.4, 1, s);
    const out = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) {
      const target = lerp(data.blur[i * 3 + k], data.img[i * 3 + k], d2);
      out.data[i * 4 + k] = lerp(data.noise[i * 3 + k], target, d1) * 255;
      out.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [step, data]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStep((s) => { if (s >= STEPS_N) { setPlaying(false); return s; } return s + 1; }), 90);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <div>
      <div className="flex items-center gap-4">
        <canvas ref={ref} width={N} height={N} className="aspect-square w-[46%] max-w-[220px] rounded-[10px] border border-hair" style={{ imageRendering: 'auto' }} aria-label="Image emerging from noise" />
        <div className="min-w-0 flex-1 space-y-2">
          <Readout k="Denoising step" v={`${step} / ${STEPS_N}`} tone={C.amber} />
          <Readout k="Noise remaining" v={`${Math.round((1 - smooth(0, 0.75, step / STEPS_N)) * 100)}%`} />
          <button className="btn-ghost !h-8 w-full !text-[12px]" onClick={() => { if (step >= STEPS_N) setStep(0); setPlaying((p) => !p); }}>{playing ? 'Pause' : step >= STEPS_N ? 'Run again' : 'Run the denoiser'}</button>
        </div>
      </div>
      <div className="mt-3"><Slider label="Step" value={step} min={0} max={STEPS_N} step={1} onChange={(v) => { setPlaying(false); setStep(v); }} format={(v) => String(v)} /></div>
      <p className="mt-1 text-[12.5px] text-bone-mute">{step === 0 ? 'Pure static. There is no image here yet, only a starting point.' : step < 18 ? 'Large shapes settle first: light above, dark below.' : step < STEPS_N ? 'Now the detail: edges, the sun, the ridgeline.' : 'A finished image, made entirely by subtracting predicted noise.'}</p>
    </div>
  );
}
