import { useEffect, useState } from 'react';
import { timerRemaining, useStore } from './store';

/** Re-render on an interval while `active`. */
export function useTick(active: boolean, ms = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

export const fmtClock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.4);
    });
    window.setTimeout(() => ctx.close(), 2500);
  } catch { /* audio is a nicety */ }
}

/** Mounted once in the shell: finishes the timer when its end time passes, even after a refresh. */
export function useTimerEngine() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const { timer, timerComplete, settings } = useStore.getState();
      if (timer.running) {
        const left = timerRemaining(timer);
        document.title = `${fmtClock(left)} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} · Cognispace`;
        if (left <= 0) {
          timerComplete();
          if (settings.sound) chime();
          document.title = 'Cognispace';
        }
      } else if (document.title !== 'Cognispace') {
        document.title = 'Cognispace';
      }
    }, 400);
    return () => window.clearInterval(id);
  }, []);
}

export function useIsNarrow(bp = 1024) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return narrow;
}
