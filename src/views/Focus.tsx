import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { clusterOf } from '../data/concepts';
import { useKnowledge } from '../knowledge/graph';
import { fmtMinutes, todayKey } from '../lib/date';
import { fmtClock, useTick } from '../lib/hooks';
import { dayOfTs, timerRemaining, useStore, type TimerMode } from '../lib/store';
import { Bar, Empty, Icon, PageHead, Panel, PanelHead, Rise, Segmented, cx } from '../ui/kit';

const MODE: Record<TimerMode, { label: string; color: string; line: string }> = {
  focus: { label: 'Focus', color: '#ffb454', line: 'One thing. Everything else can wait.' },
  short: { label: 'Short break', color: '#5fd4c4', line: 'Stand up. Look at something far away.' },
  long: { label: 'Long break', color: '#5fd4c4', line: 'A proper rest. You earned the distance.' },
};

function Dial() {
  const timer = useStore((s) => s.timer);
  useTick(timer.running, 200);
  const left = timerRemaining(timer);
  const frac = 1 - left / timer.totalMs;
  const { color } = MODE[timer.mode];
  const S = 340, R = 138, C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      <motion.div className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: color }}
        animate={{ opacity: timer.running ? [0.1, 0.2, 0.1] : 0.06, scale: timer.running ? [1, 1.08, 1] : 1 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />
      <svg viewBox={`0 0 ${S} ${S}`} className="relative h-full w-full">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          const r1 = 158, r2 = major ? 166 : 162;
          const passed = i / 60 <= frac && frac > 0;
          return <line key={i} x1={S / 2 + Math.cos(a) * r1} y1={S / 2 + Math.sin(a) * r1} x2={S / 2 + Math.cos(a) * r2} y2={S / 2 + Math.sin(a) * r2}
            stroke={passed ? color : 'rgba(236,230,218,0.2)'} strokeWidth={major ? 1.6 : 1} strokeLinecap="round" />;
        })}
        <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="rgba(236,230,218,0.07)" strokeWidth={3} />
        <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform={`rotate(-90 ${S / 2} ${S / 2})`} style={{ transition: 'stroke-dashoffset .3s linear' }} />
        {frac > 0 && (() => {
          const a = frac * Math.PI * 2 - Math.PI / 2;
          return <circle cx={S / 2 + Math.cos(a) * R} cy={S / 2 + Math.sin(a) * R} r={5} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />;
        })()}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="label mb-2" style={{ color }}>{MODE[timer.mode].label}</span>
        <span className="num text-[64px] font-medium leading-none tracking-tight text-bone sm:text-[76px]">{fmtClock(left)}</span>
        <span className="mt-4 flex items-center gap-1.5" aria-label={`Round ${((timer.round - 1) % 4) + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-1.5 rounded-full transition-all', i < ((timer.round - 1) % 4) + (timer.mode === 'focus' ? 0 : 1) ? 'w-4 bg-amber' : i === (timer.round - 1) % 4 && timer.mode === 'focus' ? 'w-4 bg-amber/40' : 'w-1.5 bg-white/15')} />)}
        </span>
      </div>
    </div>
  );
}

export default function Focus() {
  const timer = useStore((s) => s.timer);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const { timerStart, timerPause, timerReset, timerComplete, timerSetMode, timerLink, setTaskStatus, setOpenConcept } = useStore.getState();
  const { concepts, byId } = useKnowledge();
  const today = todayKey();

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'done').sort((a, b) => b.priority - a.priority), [tasks]);
  const linkedTask = tasks.find((t) => t.id === timer.taskId);
  const linkedConcept = timer.conceptId ? byId.get(timer.conceptId) : undefined;
  const todays = useMemo(() => sessions.filter((s) => dayOfTs(s.start) === today).sort((a, b) => b.start - a.start), [sessions, today]);
  const minutesToday = todays.reduce((a, s) => a + s.minutes, 0);
  const started = timer.running || timer.remainingMs < timer.totalMs;

  return (
    <>
      <PageHead index="08" kicker="Focus" title={<>Protect the <em className="text-amber">hour</em></>} sub={MODE[timer.mode].line} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Rise className="lg:col-span-7">
          <Panel className="flex h-full flex-col items-center !py-8 sm:!py-10">
            <Segmented id="timermode" value={timer.mode} onChange={(m) => { if (!timer.running || window.confirm('Switch mode and discard the running timer?')) timerSetMode(m); }}
              options={[{ value: 'focus', label: `Focus ${settings.focusMin}` }, { value: 'short', label: `Short ${settings.shortMin}` }, { value: 'long', label: `Long ${settings.longMin}` }]} />
            <div className="my-7 w-full"><Dial /></div>
            <div className="flex items-center gap-3">
              <button className="btn-ghost !h-11 !w-11 !px-0" onClick={timerReset} disabled={!started} title="Reset (time already focused is logged)" aria-label="Reset timer"><Icon name="reset" /></button>
              <button onClick={timer.running ? timerPause : timerStart}
                className="btn !h-14 min-w-[168px] bg-bone !text-[15px] font-semibold text-ink-950 shadow-[0_0_50px_-10px_rgba(236,230,218,0.5)] hover:bg-white">
                <Icon name={timer.running ? 'pause' : 'play'} size={15} />{timer.running ? 'Pause' : started ? 'Resume' : 'Start'}
              </button>
              <button className="btn-ghost !h-11 !w-11 !px-0" onClick={timerComplete} disabled={!started} title="Finish this round now" aria-label="Finish this round now"><Icon name="check" /></button>
            </div>
            <p className="label mt-6 !text-bone-faint">The timer keeps running if you switch views or refresh</p>
          </Panel>
        </Rise>

        <div className="space-y-4 lg:col-span-5 lg:space-y-5">
          <Rise i={1}>
            <Panel>
              <PanelHead index="A" title="Focusing on" />
              <div className="space-y-3">
                <label className="block">
                  <span className="label mb-1.5 block">Task</span>
                  <select className="field" value={timer.taskId ?? ''} onChange={(e) => {
                    const t = tasks.find((x) => x.id === e.target.value);
                    timerLink({ taskId: t?.id, conceptId: t?.conceptId ?? timer.conceptId });
                  }}>
                    <option value="">No task</option>
                    {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    {linkedTask && linkedTask.status === 'done' && <option value={linkedTask.id}>{linkedTask.title} (done)</option>}
                  </select>
                </label>
                <label className="block">
                  <span className="label mb-1.5 block">Concept</span>
                  <select className="field" value={timer.conceptId ?? ''} onChange={(e) => timerLink({ taskId: timer.taskId, conceptId: e.target.value || undefined })}>
                    <option value="">No concept</option>
                    {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
              </div>
              {(linkedTask || linkedConcept) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {linkedTask && linkedTask.status !== 'done' && <button className="btn-ghost" onClick={() => setTaskStatus(linkedTask.id, 'done')}><Icon name="check" size={14} />Mark task done</button>}
                  {linkedConcept && (
                    <button className="btn-ghost" onClick={() => setOpenConcept(linkedConcept.id)}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: clusterOf(linkedConcept.cluster).color }} />Open card
                    </button>
                  )}
                </div>
              )}
            </Panel>
          </Rise>

          <Rise i={2}>
            <Panel>
              <PanelHead index="B" title="Today" right={<span className="num text-[12px] text-bone">{fmtMinutes(minutesToday)} <span className="text-bone-faint">/ {fmtMinutes(settings.focusTarget)}</span></span>} />
              <Bar value={minutesToday / Math.max(1, settings.focusTarget)} height={3} />
              {todays.length === 0 ? (
                <Empty icon="focus" title="No sessions yet" body="The first one is the hardest. Start the clock and decide later whether you feel like it." />
              ) : (
                <ul className="mt-4 space-y-1">
                  {todays.map((s) => {
                    const t = tasks.find((x) => x.id === s.taskId);
                    const c = s.conceptId ? byId.get(s.conceptId) : undefined;
                    const d = new Date(s.start);
                    return (
                      <li key={s.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2 text-[13px]">
                        <span className="num w-11 text-bone-mute">{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1 truncate text-bone-dim">{t?.title ?? c?.title ?? 'Unlinked session'}</span>
                        {c && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: clusterOf(c.cluster).color }} title={c.title} />}
                        <span className="num text-bone">{s.minutes}m</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </Rise>
        </div>
      </div>
    </>
  );
}
