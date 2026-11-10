import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';
import Lenis from 'lenis';
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/kit';
import { heroState } from './state';

const HeroScene = lazy(() => import('./Scene'));

/* ------------------------- kinetic typography -------------------------- */

function Word({ children, progress, from, to, out }: { children: ReactNode; progress: MotionValue<number>; from: number; to: number; out?: [number, number] }) {
  const stops = out ? [from, to, out[0], out[1]] : [from, to];
  const opacity = useTransform(progress, stops, out ? [0, 1, 1, 0] : [0, 1]);
  const y = useTransform(progress, stops, out ? [28, 0, 0, -22] : [28, 0]);
  const blur = useTransform(progress, stops, out ? [10, 0, 0, 8] : [10, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return <motion.span className="inline-block will-change-transform" style={{ opacity, y, filter }}>{children}&nbsp;</motion.span>;
}

/** A line of copy whose words arrive one at a time between `a` and `b` of scroll progress. */
function Kinetic({ lines, progress, a, b, hold = true, className }: { lines: (string | { t: string; em?: boolean })[][]; progress: MotionValue<number>; a: number; b: number; hold?: boolean; className?: string }) {
  const words = lines.flat();
  const span = b - a;
  const inEnd = a + span * 0.42;
  const out: [number, number] | undefined = hold ? undefined : [b - span * 0.2, b];
  let i = 0;
  return (
    <div className={className}>
      {lines.map((line, li) => (
        <div key={li} className="overflow-visible">
          {line.map((w) => {
            const idx = i++;
            const from = a + ((inEnd - a) * idx) / words.length;
            const to = from + (inEnd - a) / words.length + span * 0.08;
            const word = typeof w === 'string' ? { t: w } : w;
            return (
              <Word key={idx} progress={progress} from={from} to={to} out={out}>
                {word.em ? <em className="text-amber">{word.t}</em> : word.t}
              </Word>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Fade({ children, progress, range, className }: { children: ReactNode; progress: MotionValue<number>; range: [number, number, number, number]; className?: string }) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, range, [16, 0, 0, -12]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? 'auto' : 'none'));
  return <motion.div className={className} style={{ opacity, y, pointerEvents }}>{children}</motion.div>;
}

const w = (s: string) => s.split(' ');

const SCENES = ['Origin', 'Constellation', 'Gravity', 'Practice', 'Enter'];

export default function Hero() {
  const enter = useStore((s) => s.enter);
  const progress = useMotionValue(0);
  const [leaving, setLeaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pct, setPct] = useState('000');
  const [scene, setScene] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    heroState.progress = 0;
    heroState.burst = 0;
    window.scrollTo(0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = new Lenis({ lerp: reduce ? 1 : 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.set(p);
      heroState.progress = p;
    };
    lenis.on('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    const onMove = (e: PointerEvent) => {
      heroState.mx = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.my = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const tm = window.setTimeout(() => setLoaded(true), 250);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.clearTimeout(tm);
      window.scrollTo(0, 0);
    };
  }, [progress]);

  useMotionValueEvent(progress, 'change', (p) => {
    setPct(String(Math.round(p * 100)).padStart(3, '0'));
    setScene(p < 0.15 ? 0 : p < 0.39 ? 1 : p < 0.63 ? 2 : p < 0.85 ? 3 : 4);
  });

  const go = () => {
    if (leaving) return;
    setLeaving(true);
    heroState.burst = 1;
    lenisRef.current?.stop();
    window.setTimeout(enter, 1150);
  };

  const scrollToScene = (i: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    lenisRef.current?.scrollTo([0, 0.27, 0.51, 0.75, 1][i] * max, { duration: 1.8 });
  };

  const introOpacity = useTransform(progress, [0, 0.07, 0.13], [1, 1, 0]);
  const introY = useTransform(progress, [0, 0.13], [0, -60]);
  const hintOpacity = useTransform(progress, [0, 0.03], [1, 0]);
  const barScale = useTransform(progress, [0, 1], [0, 1]);

  const headline = ['Everything', 'you', 'know,', 'in', 'one', 'living', 'place.'];

  return (
    <div className="relative" style={{ height: '640vh' }}>
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-ink-950">
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ duration: 2.2, ease: 'easeOut' }}>
          <Suspense fallback={null}><HeroScene /></Suspense>
        </motion.div>

        {/* readability scrim on the text side */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,9,0.72)_0%,rgba(6,7,9,0.25)_42%,transparent_65%)] max-md:bg-[linear-gradient(0deg,rgba(6,7,9,0.85)_0%,rgba(6,7,9,0.2)_50%,transparent_70%)]" />

        {/* chrome */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
          <div className="flex items-center gap-3">
            <span className="relative grid h-7 w-7 place-items-center">
              <span className="absolute inset-0 rounded-full border border-amber/50" />
              <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_12px_2px_rgba(255,180,84,0.8)]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-bone">Cognispace</span>
          </div>
          <button onClick={go} className="btn-ghost !h-8 bg-ink-950/40 !text-[12px] backdrop-blur-md">
            Skip intro <Icon name="arrow" size={13} />
          </button>
        </div>

        {/* scene index rail */}
        <nav className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-3 sm:right-10 md:flex" aria-label="Intro chapters">
          {SCENES.map((s, i) => (
            <button key={s} onClick={() => scrollToScene(i)} className="group flex items-center gap-3">
              <span className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${scene === i ? 'text-bone opacity-100' : 'text-bone-mute opacity-0 group-hover:opacity-100'}`}>{s}</span>
              <span className={`h-px transition-all duration-500 ${scene === i ? 'w-9 bg-amber' : 'w-4 bg-bone-faint group-hover:bg-bone-dim'}`} />
            </button>
          ))}
        </nav>

        {/* copy */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end px-6 pb-[16vh] sm:px-10 md:items-center md:pb-0 lg:px-[7vw]">
          <div className="relative w-full max-w-[760px]">
            {/* 01 - timed on load, leaves on scroll */}
            <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:top-1/2 md:-translate-y-1/2">
            <motion.div style={{ opacity: introOpacity, y: introY }}>
              <motion.div className="label mb-6 flex items-center gap-3 !text-bone-dim"
                initial={{ opacity: 0, x: -10 }} animate={loaded ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5, duration: 0.9 }}>
                <span className="h-px w-8 bg-amber" /> A knowledge operating system
              </motion.div>
              <h1 className="display text-[13.5vw] leading-[0.95] sm:text-[72px] lg:text-[96px]">
                {headline.map((word, i) => (
                  <motion.span key={i} className="inline-block"
                    initial={{ opacity: 0, y: 44, filter: 'blur(14px)' }}
                    animate={loaded ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                    transition={{ delay: 0.8 + i * 0.13, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}>
                    {word === 'living' ? <em className="text-amber">{word}</em> : word}&nbsp;
                  </motion.span>
                ))}
              </h1>
              <motion.p className="mt-7 max-w-md text-[15px] leading-relaxed text-bone-dim sm:text-[17px]"
                initial={{ opacity: 0, y: 14 }} animate={loaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 2.1, duration: 1 }}>
                Plan the day, protect your focus, and watch what you understand take shape as a map you can fly through.
              </motion.p>
            </motion.div>
            </div>

            {/* 02 */}
            <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <Fade progress={progress} range={[0.16, 0.2, 0.33, 0.38]} className="label mb-6 flex items-center gap-3 !text-bone-dim">
                <span className="text-amber">02</span> Constellation
              </Fade>
              <Kinetic progress={progress} a={0.16} b={0.39} hold={false}
                className="display text-[12vw] leading-[0.98] sm:text-[68px] lg:text-[92px]"
                lines={[w('Knowledge is not a list.'), ['It', 'is', 'a', { t: 'constellation.', em: true }]]} />
            </div>

            {/* 03 */}
            <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <Fade progress={progress} range={[0.41, 0.45, 0.57, 0.62]} className="label mb-6 flex items-center gap-3 !text-bone-dim">
                <span className="text-amber">03</span> Gravity
              </Fade>
              <Kinetic progress={progress} a={0.41} b={0.63} hold={false}
                className="display text-[12vw] leading-[0.98] sm:text-[68px] lg:text-[92px]"
                lines={[w('Every idea you learn'), [{ t: 'bends', em: true }, 'the', 'ones', 'around', 'it.']]} />
            </div>

            {/* 04 */}
            <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <Fade progress={progress} range={[0.65, 0.69, 0.8, 0.85]} className="label mb-6 flex items-center gap-3 !text-bone-dim">
                <span className="text-amber">04</span> Practice
              </Fade>
              <Kinetic progress={progress} a={0.65} b={0.86} hold={false}
                className="display text-[11vw] leading-[1] sm:text-[60px] lg:text-[80px]"
                lines={[w('Plan the day.'), w('Protect the focus.'), ['Map', 'what', 'you', { t: 'understand.', em: true }]]} />
            </div>

            {/* 05 */}
            <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <Kinetic progress={progress} a={0.88} b={1.06}
                className="display text-[12vw] leading-[0.98] sm:text-[68px] lg:text-[92px]"
                lines={[w('One system.'), ['Entirely', { t: 'yours.', em: true }]]} />
              <Fade progress={progress} range={[0.94, 0.985, 2, 3]} className="mt-8">
                <p className="mb-7 max-w-md text-[15px] leading-relaxed text-bone-dim sm:text-[16px]">
                  No account. No cloud. Everything you write stays in this browser.
                </p>
                <button onClick={go}
                  className="group pointer-events-auto relative inline-flex h-14 items-center gap-4 rounded-full bg-amber pl-7 pr-2.5 text-[15px] font-semibold text-ink-950 shadow-[0_0_60px_-6px_rgba(255,180,84,0.65)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]">
                  Enter Cognispace
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-950 text-amber transition-transform duration-300 group-hover:translate-x-0.5">
                    <Icon name="arrow" size={15} />
                  </span>
                </button>
              </Fade>
            </div>
          </div>
        </div>

        {/* bottom chrome */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 pb-5 sm:px-10 sm:pb-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-mute">
            <span className="text-bone-dim">{pct}</span> / 100
            <div className="mt-2 h-px w-28 bg-bone-faint/60"><motion.div className="h-px origin-left bg-amber" style={{ scaleX: barScale }} /></div>
          </div>
          <motion.div style={{ opacity: hintOpacity }} className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-bone-dim">
            Scroll
            <span className="relative h-9 w-px overflow-hidden bg-bone-faint/50">
              <motion.span className="absolute left-0 top-0 h-3 w-px bg-amber" animate={{ y: [-12, 36] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
            </span>
          </motion.div>
          <div className="hidden text-right font-mono text-[10px] uppercase tracking-[0.2em] text-bone-mute sm:block">
            28 concepts &middot; 51 links<br />stored locally
          </div>
        </div>

        {/* exit flash */}
        <motion.div className="pointer-events-none absolute inset-0 z-30"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,214,160,0.95), rgba(255,180,84,0.55) 30%, rgba(6,7,9,1) 72%)' }}
          initial={{ opacity: 0, scale: 0.4 }} animate={leaving ? { opacity: [0, 0.9, 1], scale: [0.4, 1.6, 3.2] } : { opacity: 0 }}
          transition={{ duration: 1.15, ease: [0.6, 0, 0.3, 1] }} />
        <motion.div className="pointer-events-none absolute inset-0 z-30 bg-ink-950" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 1 : 0 }} transition={{ delay: leaving ? 0.7 : 0, duration: 0.45 }} />
      </div>
    </div>
  );
}
