import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CONCEPTS, clusterOf } from '../data/concepts';
import { fmtLong, fmtMinutes, fmtShort, greeting, todayKey } from '../lib/date';
import { dayOfTs, dayScore, habitStreak, useStore, type Task } from '../lib/store';
import { Bar, Check, Empty, Icon, PageHead, Panel, PanelHead, Ring, Rise, cx } from '../ui/kit';
import { QuickAdd, TaskEditor, TaskRow } from './taskparts';

function ScorePanel() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const sc = useMemo(() => dayScore({ tasks, habits, sessions, progress, settings }, todayKey()), [tasks, habits, sessions, progress, settings]);

  const parts = [
    { k: 'Tasks', v: sc.tasks, max: 40, detail: `${sc.tasksDone} of ${sc.tasksPlanned} done`, color: '#ffb454' },
    { k: 'Habits', v: sc.habits, max: 30, detail: `${sc.habitsDone} of ${habits.length} checked`, color: '#5fd4c4' },
    { k: 'Focus', v: sc.focus, max: 20, detail: `${fmtMinutes(sc.focusMin)} of ${fmtMinutes(settings.focusTarget)}`, color: '#ff6b5e' },
    { k: 'Learning', v: sc.learning, max: 10, detail: sc.learning >= 10 ? 'Concept completed' : sc.learning > 0 ? 'Card opened' : 'Nothing yet', color: '#8fa8ff' },
  ];
  // the insight: which single action moves the score most right now
  const gaps = [
    { gain: sc.tasksPlanned ? Math.round(40 / sc.tasksPlanned) : 0, room: 40 - sc.tasks, text: 'finish one more task' },
    { gain: habits.length ? Math.round(30 / habits.length) : 0, room: 30 - sc.habits, text: 'check off a habit' },
    { gain: Math.min(20 - sc.focus, Math.round((settings.focusMin / Math.max(1, settings.focusTarget)) * 20)), room: 20 - sc.focus, text: `run one ${settings.focusMin}-minute focus session` },
    { gain: 10 - sc.learning, room: 10 - sc.learning, text: 'finish one concept card' },
  ].map((g) => ({ ...g, gain: Math.min(g.gain, g.room) })).sort((a, b) => b.gain - a.gain);
  const best = gaps[0];
  const verdict = sc.total >= 85 ? 'An excellent day.' : sc.total >= 60 ? 'Solid. Keep the line.' : sc.total >= 30 ? 'Under way.' : 'A clean slate.';

  return (
    <Panel>
      <PanelHead index="A" title="Day score" right={<span className="label !text-bone-faint">Live</span>} />
      <div className="flex items-center gap-6">
        <Ring value={sc.total / 100} size={132} stroke={5}>
          <div className="text-center">
            <div className="num text-[40px] leading-none text-bone">{sc.total}</div>
            <div className="label mt-1.5">of 100</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[26px] italic leading-tight text-bone">{verdict}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
            {best.gain > 0 ? <>Biggest lift right now: {best.text} <span className="num text-amber">+{best.gain}</span>.</> : 'Every dial is full. Rest counts too.'}
          </p>
        </div>
      </div>
      <dl className="mt-6 space-y-3.5">
        {parts.map((p) => (
          <div key={p.k}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
              <dt className="text-bone-dim">{p.k} <span className="text-bone-faint">&middot; {p.detail}</span></dt>
              <dd className="num text-bone">{p.v}<span className="text-bone-faint">/{p.max}</span></dd>
            </div>
            <Bar value={p.v / p.max} color={p.color} height={3} />
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Schedule() {
  const events = useStore((s) => s.events);
  const addEvent = useStore((s) => s.addEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', start: '09:00', end: '10:00' });
  const today = todayKey();
  const list = events.filter((e) => e.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Panel>
      <PanelHead index="D" title="Schedule" right={
        <button className="btn-quiet !h-7 !px-2 !text-[12px]" onClick={() => setAdding((a) => !a)}><Icon name={adding ? 'x' : 'plus'} size={13} />{adding ? 'Close' : 'Block'}</button>} />
      <AnimatePresence initial={false}>
        {adding && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
            onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; addEvent({ date: today, title: f.title.trim(), start: f.start, end: f.end < f.start ? f.start : f.end }); setF({ ...f, title: '' }); setAdding(false); }}>
            <div className="mb-4 space-y-2">
              <input autoFocus className="field" placeholder="What is this time for?" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <div className="flex gap-2">
                <input type="time" className="field num" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} aria-label="Start" />
                <input type="time" className="field num" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} aria-label="End" />
                <button className="btn-primary shrink-0" disabled={!f.title.trim()}>Add</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {list.length === 0 ? (
        <Empty icon="clock" title="An open day" body="No time is spoken for. Block an hour for the thing that matters before something else claims it." />
      ) : (
        <ol className="relative ml-1 space-y-1 border-l border-hair pl-5">
          {list.map((e) => {
            const past = e.end <= hhmm;
            const live = e.start <= hhmm && hhmm < e.end;
            return (
              <li key={e.id} className="group relative py-2">
                <span className={cx('absolute -left-[24.5px] top-[15px] h-2 w-2 rounded-full border', live ? 'border-amber bg-amber shadow-[0_0_10px_rgba(255,180,84,0.9)]' : past ? 'border-bone-faint bg-ink-850' : 'border-bone-mute bg-ink-850')} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="num text-[11px] text-bone-mute">{e.start} &ndash; {e.end}{live && <span className="ml-2 text-amber">now</span>}</div>
                    <div className={cx('truncate text-[14px]', past ? 'text-bone-mute' : 'text-bone')}>{e.title}</div>
                  </div>
                  <button aria-label={`Remove ${e.title}`} onClick={() => deleteEvent(e.id)} className="grid h-6 w-6 place-items-center rounded-full text-bone-faint opacity-0 transition hover:text-ember focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"><Icon name="x" size={13} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export default function Today() {
  const name = useStore((s) => s.settings.name);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const goals = useStore((s) => s.goals);
  const progress = useStore((s) => s.progress);
  const sessions = useStore((s) => s.sessions);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const setView = useStore((s) => s.setView);
  const setOpenConcept = useStore((s) => s.setOpenConcept);
  const [editing, setEditing] = useState<Task | null>(null);
  const today = todayKey();

  const todays = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done' && t.due && t.due <= today).sort((a, b) => b.priority - a.priority || a.order - b.order);
    const done = tasks.filter((t) => t.completedAt && dayOfTs(t.completedAt) === today);
    return { open, done };
  }, [tasks, today]);

  const next = useMemo(() => {
    const started = CONCEPTS.find((c) => progress[c.id]?.opened && !progress[c.id]?.mastered);
    return started ?? CONCEPTS.find((c) => !progress[c.id]?.mastered);
  }, [progress]);
  const mastered = CONCEPTS.filter((c) => progress[c.id]?.mastered).length;
  const focusToday = sessions.filter((s) => dayOfTs(s.start) === today).reduce((a, s) => a + s.minutes, 0);
  const habitsLeft = habits.filter((h) => !h.log[today]).length;

  return (
    <>
      <PageHead index="01" kicker={fmtLong(today)}
        title={<>{greeting()}{name ? <>, <em className="text-amber">{name}</em></> : ''}.</>}
        sub={<>{todays.open.length ? `${todays.open.length} task${todays.open.length > 1 ? 's' : ''} on deck` : 'Nothing due'}, {habitsLeft ? `${habitsLeft} habit${habitsLeft > 1 ? 's' : ''} to check` : 'habits all checked'}, {fmtMinutes(focusToday)} of focus so far.</>}
        right={<button className="btn-primary" onClick={() => setView('focus')}><Icon name="play" size={13} />Start focus</button>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Rise i={0} className="lg:col-span-5"><ScorePanel /></Rise>

        <Rise i={1} className="lg:col-span-7">
          <Panel className="h-full">
            <PanelHead index="B" title="On deck today" right={<button className="btn-quiet !h-7 !px-2 !text-[12px]" onClick={() => setView('tasks')}>All tasks<Icon name="arrow" size={12} /></button>} />
            <QuickAdd defaults={{ due: today }} placeholder="Add a task for today" />
            {todays.open.length + todays.done.length === 0 ? (
              <Empty icon="tasks" title="Nothing on deck" body="Add the one thing that would make today count. Just one." />
            ) : (
              <ul className="mt-2">
                <AnimatePresence initial={false}>
                  {todays.open.map((t) => <TaskRow key={t.id} task={t} onOpen={setEditing} compact />)}
                  {todays.done.map((t) => <TaskRow key={t.id} task={t} onOpen={setEditing} compact />)}
                </AnimatePresence>
              </ul>
            )}
          </Panel>
        </Rise>

        <Rise i={2} className="lg:col-span-4">
          <Panel className="h-full">
            <PanelHead index="C" title="Habits" right={<button className="btn-quiet !h-7 !px-2 !text-[12px]" onClick={() => setView('habits')}>Heatmaps<Icon name="arrow" size={12} /></button>} />
            {habits.length === 0 ? (
              <Empty icon="habits" title="No habits yet" body="Pick one small thing you can do even on your worst day." action={<button className="btn-ghost" onClick={() => setView('habits')}>Add a habit</button>} />
            ) : (
              <ul className="space-y-1">
                {habits.map((h) => {
                  const st = habitStreak(h);
                  const on = !!h.log[today];
                  return (
                    <li key={h.id} onClick={() => toggleHabit(h.id, today)} className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2.5 transition-colors hover:bg-white/[0.035]">
                      <Check checked={on} onChange={() => toggleHabit(h.id, today)} color="#5fd4c4" label={h.name} />
                      <div className="min-w-0 flex-1">
                        <p className={cx('truncate text-[14px]', on ? 'text-bone-mute' : 'text-bone')}>{h.name}</p>
                        {h.cue && <p className="truncate text-[12px] text-bone-mute">{h.cue}</p>}
                      </div>
                      <span className={cx('num flex items-center gap-1 text-[12px]', st.current > 0 ? 'text-amber' : 'text-bone-faint')} title={`${st.current}-day streak`}>
                        <Icon name="flame" size={13} />{st.current}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </Rise>

        <Rise i={3} className="lg:col-span-4"><Schedule /></Rise>

        <Rise i={4} className="space-y-4 lg:col-span-4 lg:space-y-5">
          {next && (
            <button onClick={() => setOpenConcept(next.id)} className="panel group block w-full overflow-hidden p-5 text-left transition-colors hover:border-[var(--hair-strong)] sm:p-6">
              <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: clusterOf(next.cluster).color }} />
              <div className="label relative mb-4 flex items-center justify-between">
                <span><span className="text-amber/80">E</span> <span className="text-bone-faint">/</span> {progress[next.id]?.opened ? 'Continue learning' : 'Learn next'}</span>
                <span className="num">{mastered}/{CONCEPTS.length}</span>
              </div>
              <div className="relative flex items-center gap-2 text-[12px] text-bone-dim">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: clusterOf(next.cluster).color }} />{clusterOf(next.cluster).name} &middot; {next.minutes} min
              </div>
              <h3 className="display relative mt-1.5 text-[30px] text-bone">{next.title}</h3>
              <p className="relative mt-2 text-[13px] leading-relaxed text-bone-dim">{next.summary}</p>
              <span className="relative mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-amber">Open card <Icon name="arrow" size={13} className="transition-transform group-hover:translate-x-1" /></span>
            </button>
          )}
          <Panel>
            <PanelHead index="F" title="Goals" right={<button className="btn-quiet !h-7 !px-2 !text-[12px]" onClick={() => setView('goals')}>Open<Icon name="arrow" size={12} /></button>} />
            {goals.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-bone-mute">No long-term goals yet. A goal gives the daily tasks a direction.</p>
            ) : (
              <ul className="space-y-4">
                {goals.slice(0, 3).map((g) => {
                  const done = g.milestones.filter((m) => m.done).length;
                  const pct = g.milestones.length ? done / g.milestones.length : 0;
                  return (
                    <li key={g.id}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13.5px] text-bone">{g.title}</span>
                        <span className="num shrink-0 text-[11px] text-bone-mute">{done}/{g.milestones.length}{g.target ? ` · ${fmtShort(g.target)}` : ''}</span>
                      </div>
                      <Bar value={pct} height={3} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </Rise>
      </div>
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </>
  );
}
