import { useMemo, useState } from 'react';
import { addDays, fmtShort, lastNDays, monthShort, todayKey, weekStart } from '../lib/date';
import { habitStreak, useStore, type Habit } from '../lib/store';
import { Check, Empty, FieldRow, Icon, Modal, PageHead, Panel, PanelHead, Rise, cx } from '../ui/kit';

const WEEKS = 18;
// one hue, light to dark on a dark surface = faint to bright
const RAMP = ['rgba(236,230,218,0.06)', '#1d4f4a', '#2a8076', '#44b3a4', '#7cf0df'];

function useGrid() {
  return useMemo(() => {
    const today = todayKey();
    const start = addDays(weekStart(today), -(WEEKS - 1) * 7);
    const weeks: string[][] = [];
    for (let w = 0; w < WEEKS; w++) weeks.push(Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
    return { weeks, today };
  }, []);
}

function Heatmap({ level, onToggle, label }: { level: (day: string) => number; onToggle?: (day: string) => void; label: (day: string) => string }) {
  const { weeks, today } = useGrid();
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1.5">
        <div className="flex gap-[3px] pl-7">
          {weeks.map((w, i) => {
            const first = i === 0 || monthShort(w[0]) !== monthShort(weeks[i - 1][0]);
            return <span key={w[0]} className="label w-[14px] overflow-visible whitespace-nowrap !text-[9px] !tracking-[0.1em]">{first ? monthShort(w[0]) : ''}</span>;
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="label mr-1 flex w-6 flex-col justify-between py-[1px] !text-[9px] !tracking-[0.08em]"><span>Mon</span><span>Thu</span><span>Sun</span></div>
          {weeks.map((w) => (
            <div key={w[0]} className="flex flex-col gap-[3px]">
              {w.map((day) => {
                const future = day > today;
                const lv = future ? 0 : level(day);
                const Tag = onToggle && !future ? 'button' : 'span';
                return (
                  <Tag key={day} title={future ? undefined : label(day)} aria-label={future ? undefined : label(day)}
                    onClick={onToggle && !future ? () => onToggle(day) : undefined}
                    className={cx('h-[14px] w-[14px] rounded-[3.5px] transition-transform duration-150', !future && onToggle && 'hover:scale-125 hover:ring-1 hover:ring-bone/40',
                      day === today && 'ring-1 ring-amber ring-offset-1 ring-offset-ink-850', future && 'opacity-30')}
                    style={{ background: RAMP[lv] }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const toggleHabit = useStore((s) => s.toggleHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const today = todayKey();
  const st = habitStreak(habit);
  const last30 = lastNDays(30).filter((d) => habit.log[d]).length;
  const on = !!habit.log[today];
  return (
    <Panel className="group">
      <div className="mb-5 flex items-start gap-3">
        <Check checked={on} onChange={() => toggleHabit(habit.id, today)} color="#5fd4c4" size={24} label={`${habit.name} today`} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-medium text-bone">{habit.name}</h3>
          {habit.cue && <p className="truncate text-[12.5px] text-bone-mute">Cue: {habit.cue}</p>}
        </div>
        <button aria-label={`Delete ${habit.name}`} onClick={() => { if (window.confirm(`Delete "${habit.name}" and its history?`)) deleteHabit(habit.id); }}
          className="grid h-7 w-7 place-items-center rounded-full text-bone-faint opacity-0 transition hover:bg-ember/10 hover:text-ember focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"><Icon name="trash" size={14} /></button>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { k: 'Streak', v: st.current, unit: 'days', hot: st.current > 0 },
          { k: 'Best', v: st.best, unit: 'days' },
          { k: 'Last 30', v: Math.round((last30 / 30) * 100), unit: '%' },
        ].map((x) => (
          <div key={x.k} className="rounded-[10px] border border-hair px-3 py-2.5">
            <div className="label mb-1 flex items-center gap-1.5">{x.hot && <Icon name="flame" size={11} className="text-amber" />}{x.k}</div>
            <div className={cx('num text-[22px] leading-none', x.hot ? 'text-amber' : 'text-bone')}>{x.v}<span className="ml-1 text-[11px] text-bone-mute">{x.unit}</span></div>
          </div>
        ))}
      </div>
      <Heatmap level={(d) => (habit.log[d] ? 3 : 0)} onToggle={(d) => toggleHabit(habit.id, d)}
        label={(d) => `${fmtShort(d)}: ${habit.log[d] ? 'done' : 'missed'} (click to change)`} />
    </Panel>
  );
}

export default function Habits() {
  const habits = useStore((s) => s.habits);
  const addHabit = useStore((s) => s.addHabit);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cue, setCue] = useState('');
  const today = todayKey();
  const doneToday = habits.filter((h) => h.log[today]).length;

  const submit = () => {
    if (!name.trim()) return;
    addHabit(name.trim(), cue.trim() || undefined);
    setName(''); setCue(''); setOpen(false);
  };

  return (
    <>
      <PageHead index="03" kicker="Habits" title={<>Small, <em className="text-amber">daily</em>, compounding</>}
        sub={habits.length ? `${doneToday} of ${habits.length} checked today. Click any past square to correct the record.` : 'A habit is a decision you only have to make once.'}
        right={<button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={14} />New habit</button>} />

      {habits.length === 0 ? (
        <Panel><Empty icon="habits" title="No habits yet" body="Start with one that takes two minutes. The streak does the rest."
          action={<button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={14} />New habit</button>} /></Panel>
      ) : (
        <div className="space-y-4 lg:space-y-5">
          <Rise>
            <Panel>
              <PanelHead index="A" title="All habits, 18 weeks" right={
                <span className="label flex items-center gap-1.5">Less{RAMP.map((c) => <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />)}More</span>} />
              <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
                <Heatmap
                  level={(d) => { const n = habits.filter((h) => h.log[d]).length; return n === 0 ? 0 : Math.max(1, Math.round((n / habits.length) * 4)); }}
                  label={(d) => `${fmtShort(d)}: ${habits.filter((h) => h.log[d]).length} of ${habits.length} habits`} />
                <dl className="grid min-w-[240px] flex-1 grid-cols-3 gap-3">
                  {(() => {
                    const d30 = lastNDays(30);
                    const checks = d30.reduce((a, d) => a + habits.filter((h) => h.log[d]).length, 0);
                    const perfect = d30.filter((d) => habits.every((h) => h.log[d])).length;
                    const longest = Math.max(0, ...habits.map((h) => habitStreak(h).current));
                    return [
                      { k: 'Check-ins, 30 days', v: checks, u: `of ${30 * habits.length}` },
                      { k: 'Perfect days, 30 days', v: perfect, u: 'days' },
                      { k: 'Longest live streak', v: longest, u: 'days' },
                    ].map((x) => (
                      <div key={x.k} className="rounded-[10px] border border-hair px-3.5 py-3">
                        <dt className="label mb-1.5 leading-relaxed">{x.k}</dt>
                        <dd className="num text-[26px] leading-none text-bone">{x.v}<span className="ml-1.5 text-[11px] text-bone-mute">{x.u}</span></dd>
                      </div>
                    ));
                  })()}
                </dl>
              </div>
            </Panel>
          </Rise>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 lg:gap-5">
            {habits.map((h, i) => <Rise key={h.id} i={i + 1}><HabitCard habit={h} /></Rise>)}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New habit" kicker="Habit">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <FieldRow label="What will you do every day?"><input autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Read 20 pages" /></FieldRow>
          <FieldRow label="Cue (optional)"><input className="field" value={cue} onChange={(e) => setCue(e.target.value)} placeholder="After breakfast" /></FieldRow>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!name.trim()}>Add habit</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
