import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy, useEffect, useState } from 'react';
import { todayKey } from '../lib/date';
import { fmtClock, useTick, useTimerEngine } from '../lib/hooks';
import { dayScore, timerRemaining, useStore, type ViewId } from '../lib/store';
import { Icon, cx } from '../ui/kit';
import Analytics from '../views/Analytics';
import Focus from '../views/Focus';
import Goals from '../views/Goals';
import Habits from '../views/Habits';
import Library from '../views/Library';
import Planner from '../views/Planner';
import SettingsView from '../views/Settings';
import Tasks from '../views/Tasks';
import Today from '../views/Today';

const Graph = lazy(() => import('../views/Graph'));
const LearningCard = lazy(() => import('../knowledge/LearningCard'));

interface NavItem { id: ViewId; label: string; icon: string; n: string }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Plan', items: [
    { id: 'today', label: 'Today', icon: 'today', n: '01' },
    { id: 'tasks', label: 'Tasks', icon: 'tasks', n: '02' },
    { id: 'habits', label: 'Habits', icon: 'habits', n: '03' },
    { id: 'goals', label: 'Goals', icon: 'goals', n: '04' },
    { id: 'week', label: 'Week', icon: 'week', n: '05' },
  ] },
  { group: 'Learn', items: [
    { id: 'graph', label: 'Knowledge Graph', icon: 'graph', n: '06' },
    { id: 'library', label: 'Library', icon: 'library', n: '07' },
  ] },
  { group: 'Deep work', items: [{ id: 'focus', label: 'Focus', icon: 'focus', n: '08' }] },
  { group: 'Reflect', items: [
    { id: 'analytics', label: 'Analytics', icon: 'analytics', n: '09' },
    { id: 'settings', label: 'Settings', icon: 'settings', n: '10' },
  ] },
];
const FLAT = NAV.flatMap((g) => g.items);
const MOBILE_MAIN: ViewId[] = ['today', 'tasks', 'graph', 'focus'];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-7 w-7 place-items-center">
        <span className="absolute inset-0 rounded-full border border-amber/50" />
        <span className="absolute inset-0 animate-[spin_14s_linear_infinite]"><span className="absolute -top-[2px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ion" /></span>
        <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_12px_2px_rgba(255,180,84,0.7)]" />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-bone">Cognispace</span>
    </div>
  );
}

function TimerChip() {
  const timer = useStore((s) => s.timer);
  const setView = useStore((s) => s.setView);
  const started = timer.running || timer.remainingMs < timer.totalMs;
  useTick(timer.running, 500);
  if (!started) return null;
  const left = timerRemaining(timer);
  const pctDone = 1 - left / timer.totalMs;
  const color = timer.mode === 'focus' ? '#ffb454' : '#5fd4c4';
  return (
    <motion.button layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => setView('focus')}
      className="group relative w-full overflow-hidden rounded-[12px] border border-hair bg-ink-900 p-3 text-left transition-colors hover:border-[var(--hair-strong)]">
      <span className="absolute inset-y-0 left-0 opacity-[0.09] transition-[width] duration-500" style={{ width: `${pctDone * 100}%`, background: color }} />
      <span className="label relative flex items-center gap-2">
        <span className={cx('h-1.5 w-1.5 rounded-full', timer.running && 'animate-pulseSoft')} style={{ background: color }} />
        {timer.mode === 'focus' ? 'Focus' : 'Break'} {timer.running ? 'running' : 'paused'}
      </span>
      <span className="num relative mt-1 block text-[22px] text-bone">{fmtClock(left)}</span>
    </motion.button>
  );
}

function ScoreChip() {
  const total = useStore((s) => dayScore(s, todayKey()).total);
  return (
    <div className="flex items-center justify-between rounded-[12px] border border-hair px-3 py-2.5">
      <span className="label">Day score</span>
      <span className="num text-[15px] text-bone">{total}<span className="text-bone-faint">/100</span></span>
    </div>
  );
}

export default function Shell() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const openConcept = useStore((s) => s.openConcept);
  const [more, setMore] = useState(false);
  useTimerEngine();

  // number keys jump between views
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = '1234567890'.indexOf(e.key);
      if (i >= 0 && FLAT[i]) setView(FLAT[i].id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setView]);

  const go = (id: ViewId) => { setView(id); setMore(false); };
  const full = view === 'graph';
  const current = FLAT.find((n) => n.id === view)!;

  return (
    <div className="app-bg fixed inset-0 flex">
      {/* sidebar */}
      <aside className="relative z-20 hidden w-[244px] shrink-0 flex-col border-r border-hair bg-ink-950/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2"><Logo /></div>
        <nav className="mt-9 flex-1 space-y-6 overflow-y-auto" aria-label="Main">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="label mb-2 px-2 !text-bone-faint">{g.group}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = view === it.id;
                  return (
                    <li key={it.id}>
                      <button onClick={() => go(it.id)} aria-current={active ? 'page' : undefined}
                        className={cx('group relative flex h-9 w-full items-center gap-3 rounded-[9px] px-2.5 text-[13.5px] transition-colors duration-200',
                          active ? 'text-bone' : 'text-bone-mute hover:text-bone')}>
                        {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-[9px] border border-hair bg-white/[0.045]" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
                        {active && <motion.span layoutId="nav-bar" className="absolute -left-4 top-2 h-5 w-[2px] rounded-r bg-amber shadow-[0_0_10px_rgba(255,180,84,0.9)]" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
                        <Icon name={it.icon} className={cx('relative transition-colors', active ? 'text-amber' : 'group-hover:text-bone-dim')} />
                        <span className="relative flex-1 text-left">{it.label}</span>
                        <span className="num relative text-[10px] text-bone-faint opacity-0 transition-opacity group-hover:opacity-100">{it.n}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-2 pt-4">
          <TimerChip />
          <ScoreChip />
          <p className="px-1 pt-2 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.16em] text-bone-faint">Local only &middot; keys 1&ndash;0 switch views</p>
        </div>
      </aside>

      {/* main */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-hair bg-ink-950/70 px-4 backdrop-blur-xl lg:hidden">
          <Logo />
          <span className="label"><span className="text-amber/80">{current.n}</span> / {current.label}</span>
        </header>

        <main className={cx('relative min-h-0 flex-1', full ? 'overflow-hidden' : 'overflow-y-auto')} id="main-scroll">
          {/* no exit animation on purpose: switching views should feel instant */}
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
              className={full ? 'h-full' : 'mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-8 sm:pt-10 lg:pb-16 lg:pt-12'}>
              <Suspense fallback={<div className="grid h-full min-h-[50vh] place-items-center"><span className="label animate-pulseSoft">Loading</span></div>}>
                {view === 'today' && <Today />}
                {view === 'tasks' && <Tasks />}
                {view === 'habits' && <Habits />}
                {view === 'goals' && <Goals />}
                {view === 'week' && <Planner />}
                {view === 'graph' && <Graph />}
                {view === 'library' && <Library />}
                {view === 'focus' && <Focus />}
                {view === 'analytics' && <Analytics />}
                {view === 'settings' && <SettingsView />}
              </Suspense>
            </motion.div>
        </main>

        {/* mobile tab bar */}
        <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-hair bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Main">
          <ul className="grid grid-cols-5">
            {MOBILE_MAIN.map((id) => {
              const it = FLAT.find((n) => n.id === id)!;
              const active = view === id;
              return (
                <li key={id}>
                  <button onClick={() => go(id)} className={cx('relative flex h-[58px] w-full flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-amber' : 'text-bone-mute')}>
                    {active && <motion.span layoutId="tab-dot" className="absolute top-0 h-[2px] w-8 rounded-b bg-amber" />}
                    <Icon name={it.icon} size={19} />
                    {it.id === 'graph' ? 'Graph' : it.label}
                  </button>
                </li>
              );
            })}
            <li>
              <button onClick={() => setMore(true)} className={cx('relative flex h-[58px] w-full flex-col items-center justify-center gap-1 text-[10px]', !MOBILE_MAIN.includes(view) ? 'text-amber' : 'text-bone-mute')}>
                {!MOBILE_MAIN.includes(view) && <motion.span layoutId="tab-dot" className="absolute top-0 h-[2px] w-8 rounded-b bg-amber" />}
                <Icon name="more" size={19} />More
              </button>
            </li>
          </ul>
        </nav>

        <AnimatePresence>
          {more && (
            <motion.div className="absolute inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setMore(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-hair bg-ink-850 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-bone-faint" />
                <ul className="grid grid-cols-2 gap-2">
                  {FLAT.filter((n) => !MOBILE_MAIN.includes(n.id)).map((it) => (
                    <li key={it.id}>
                      <button onClick={() => go(it.id)} className={cx('flex h-12 w-full items-center gap-3 rounded-[12px] border border-hair px-3.5 text-[14px]', view === it.id ? 'text-amber' : 'text-bone-dim')}>
                        <Icon name={it.icon} />{it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Suspense fallback={null}>
        <AnimatePresence>{openConcept && <LearningCard key="card" id={openConcept} />}</AnimatePresence>
      </Suspense>
    </div>
  );
}
