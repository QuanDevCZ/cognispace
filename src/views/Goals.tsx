import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { diffDays, fmtShort, todayKey } from '../lib/date';
import { useStore, type Goal } from '../lib/store';
import { Check, Empty, FieldRow, Icon, Modal, PageHead, Panel, Ring, Rise, cx } from '../ui/kit';

function GoalCard({ goal }: { goal: Goal }) {
  const toggleMilestone = useStore((s) => s.toggleMilestone);
  const addMilestone = useStore((s) => s.addMilestone);
  const deleteMilestone = useStore((s) => s.deleteMilestone);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const [m, setM] = useState('');
  const done = goal.milestones.filter((x) => x.done).length;
  const pct = goal.milestones.length ? done / goal.milestones.length : 0;
  const left = goal.target ? diffDays(goal.target, todayKey()) : null;
  const nextIdx = goal.milestones.findIndex((x) => !x.done);

  return (
    <Panel className="group/goal">
      <div className="flex items-start gap-5">
        <Ring value={pct} size={84} stroke={4} color={pct === 1 ? '#5fd4c4' : '#ffb454'}>
          <span className="num text-[18px] text-bone">{Math.round(pct * 100)}<span className="text-[10px] text-bone-mute">%</span></span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="label mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{done}/{goal.milestones.length} milestones</span>
            {left !== null && <span className={cx(left < 0 ? 'text-ember' : left < 14 ? 'text-amber' : '')}>{left < 0 ? `${-left} days past target` : `${left} days left`} &middot; {fmtShort(goal.target!)}</span>}
          </div>
          <h3 className="display text-[28px] text-bone sm:text-[32px]">{goal.title}</h3>
          {goal.why && <p className="mt-2 text-[13.5px] italic leading-relaxed text-bone-dim">&ldquo;{goal.why}&rdquo;</p>}
        </div>
        <button aria-label={`Delete goal ${goal.title}`} onClick={() => { if (window.confirm(`Delete the goal "${goal.title}"?`)) deleteGoal(goal.id); }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-bone-faint opacity-0 transition hover:bg-ember/10 hover:text-ember focus-visible:opacity-100 group-hover/goal:opacity-100 max-lg:opacity-100"><Icon name="trash" size={14} /></button>
      </div>

      <ol className="relative mt-6 space-y-0.5">
        <AnimatePresence initial={false}>
          {goal.milestones.map((ms, i) => (
            <motion.li key={ms.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="group relative flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-white/[0.03]">
              {i < goal.milestones.length - 1 && <span className={cx('absolute left-[17.5px] top-[30px] h-[calc(100%-18px)] w-px', ms.done ? 'bg-amber/50' : 'bg-white/10')} />}
              <Check checked={ms.done} onChange={() => toggleMilestone(goal.id, ms.id)} label={ms.title} />
              <span className={cx('flex-1 text-[14px]', ms.done ? 'text-bone-mute line-through decoration-bone-faint' : 'text-bone')}>{ms.title}</span>
              {i === nextIdx && <span className="chip !h-[22px] !border-amber/30 !text-amber">Next</span>}
              <button aria-label={`Remove milestone ${ms.title}`} onClick={() => deleteMilestone(goal.id, ms.id)}
                className="grid h-6 w-6 place-items-center rounded-full text-bone-faint opacity-0 transition hover:text-ember focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"><Icon name="x" size={13} /></button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <form className="mt-2 flex h-9 items-center gap-3 rounded-[10px] border border-dashed border-hair px-3 focus-within:border-amber/50"
        onSubmit={(e) => { e.preventDefault(); if (!m.trim()) return; addMilestone(goal.id, m.trim()); setM(''); }}>
        <Icon name="plus" size={14} className="text-bone-mute" />
        <input value={m} onChange={(e) => setM(e.target.value)} placeholder="Add a milestone" aria-label="Add a milestone"
          className="h-full flex-1 bg-transparent text-[13.5px] placeholder:text-bone-faint focus:outline-none" />
      </form>
    </Panel>
  );
}

export default function Goals() {
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', why: '', target: '', milestones: '' });

  const submit = () => {
    if (!f.title.trim()) return;
    addGoal({ title: f.title.trim(), why: f.why.trim() || undefined, target: f.target || undefined, milestones: f.milestones.split('\n').map((x) => x.trim()) });
    setF({ title: '', why: '', target: '', milestones: '' });
    setOpen(false);
  };

  return (
    <>
      <PageHead index="04" kicker="Goals" title={<>The <em className="text-amber">long</em> game</>}
        sub="A goal is a direction; milestones are how you know you are moving. Keep this list short enough to remember."
        right={<button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={14} />New goal</button>} />

      {goals.length === 0 ? (
        <Panel><Empty icon="goals" title="No destination yet" body="Name one thing you want to be true a few months from now, then break it into steps you could tick off."
          action={<button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={14} />New goal</button>} /></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 lg:gap-5">
          {goals.map((g, i) => <Rise key={g.id} i={i}><GoalCard goal={g} /></Rise>)}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New goal" kicker="Goal">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <FieldRow label="Goal"><input autoFocus className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Understand how modern AI works" /></FieldRow>
          <FieldRow label="Why it matters"><input className="field" value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="The reason you will still care in week six" /></FieldRow>
          <FieldRow label="Target date"><input type="date" className="field num" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></FieldRow>
          <FieldRow label="Milestones, one per line"><textarea className="field" rows={4} value={f.milestones} onChange={(e) => setF({ ...f, milestones: e.target.value })} placeholder={'First checkpoint\nSecond checkpoint'} /></FieldRow>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!f.title.trim()}>Create goal</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
