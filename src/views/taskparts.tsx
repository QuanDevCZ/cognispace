import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { clusterOf } from '../data/concepts';
import { useKnowledge } from '../knowledge/graph';
import { diffDays, fmtShort, relativeDay, todayKey } from '../lib/date';
import { useStore, type Priority, type Status, type Task } from '../lib/store';
import { Check, FieldRow, Icon, Modal, PRIORITY, PriorityMark, Segmented, cx } from '../ui/kit';

export function DueChip({ task }: { task: Task }) {
  if (!task.due) return null;
  if (task.status === 'done') return <span className="num whitespace-nowrap text-[11px] text-bone-faint">{fmtShort(task.due)}</span>;
  const overdue = diffDays(task.due, todayKey()) < 0;
  const today = task.due === todayKey();
  return (
    <span className={cx('num whitespace-nowrap text-[11px]', overdue ? 'text-ember' : today ? 'text-amber' : 'text-bone-mute')}>
      {relativeDay(task.due)}
    </span>
  );
}

export function ConceptChip({ id, onClick }: { id?: string; onClick?: () => void }) {
  const { byId } = useKnowledge();
  const c = id ? byId.get(id) : undefined;
  if (!c) return null;
  const col = clusterOf(c.cluster).color;
  return (
    <span onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      className={cx('chip max-w-[160px] !h-[22px] !px-2', onClick && 'cursor-pointer hover:text-bone')}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: col }} />
      <span className="truncate">{c.title}</span>
    </span>
  );
}

export function TaskRow({ task, onOpen, compact }: { task: Task; onOpen: (t: Task) => void; compact?: boolean }) {
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const timerLink = useStore((s) => s.timerLink);
  const setView = useStore((s) => s.setView);
  const setOpenConcept = useStore((s) => s.setOpenConcept);
  const done = task.status === 'done';
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}
      onClick={() => onOpen(task)}
      className="group flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2.5 transition-colors hover:bg-white/[0.035]">
      <Check checked={done} onChange={() => setTaskStatus(task.id, done ? 'todo' : 'done')} label={`Complete ${task.title}`} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[14px] transition-colors', done ? 'text-bone-mute line-through decoration-bone-faint' : 'text-bone')}>{task.title}</p>
        {!compact && task.notes && <p className="mt-0.5 truncate text-[12px] text-bone-mute">{task.notes}</p>}
      </div>
      {task.status === 'doing' && <span className="chip !h-[22px] !border-amber/30 !text-amber max-sm:hidden">In progress</span>}
      <span className="hidden sm:inline-flex"><ConceptChip id={task.conceptId} onClick={() => setOpenConcept(task.conceptId!)} /></span>
      <DueChip task={task} />
      <PriorityMark p={task.priority} />
      {!done && (
        <button title="Focus on this" aria-label="Start a focus session on this task"
          onClick={(e) => { e.stopPropagation(); timerLink({ taskId: task.id, conceptId: task.conceptId }); setView('focus'); }}
          className="grid h-7 w-7 place-items-center rounded-full text-bone-mute opacity-0 transition-all hover:bg-amber/15 hover:text-amber focus-visible:opacity-100 group-hover:opacity-100 max-lg:hidden">
          <Icon name="focus" size={15} />
        </button>
      )}
    </motion.li>
  );
}

export function QuickAdd({ placeholder = 'Add a task and press Enter', defaults, onAdded }: { placeholder?: string; defaults?: Partial<Task>; onAdded?: () => void }) {
  const addTask = useStore((s) => s.addTask);
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; addTask({ title: t, ...defaults }); setV(''); onAdded?.(); }}
      className="group flex h-10 items-center gap-3 rounded-[10px] border border-dashed border-hair px-3 transition-colors focus-within:border-amber/50 hover:border-[var(--hair-strong)]">
      <Icon name="plus" size={15} className="text-bone-mute group-focus-within:text-amber" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-bone placeholder:text-bone-faint focus:outline-none" />
      {v && <kbd className="num rounded border border-hair px-1.5 py-0.5 text-[10px] text-bone-mute">Enter</kbd>}
    </form>
  );
}

export function TaskEditor({ task, create, onClose }: { task: Task | null; create?: Partial<Task> | null; onClose: () => void }) {
  const { concepts } = useKnowledge();
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const deleteTask = useStore((s) => s.deleteTask);
  const open = !!task || !!create;
  const [f, setF] = useState<Partial<Task>>({});
  useEffect(() => {
    if (task) setF(task);
    else if (create) setF({ title: '', priority: 0, status: 'todo', ...create });
  }, [task, create]);

  const save = () => {
    const title = (f.title ?? '').trim();
    if (!title) return;
    const patch = { title, notes: f.notes?.trim() || undefined, priority: (f.priority ?? 0) as Priority, due: f.due || undefined, conceptId: f.conceptId || undefined };
    if (task) {
      updateTask(task.id, patch);
      if (f.status && f.status !== task.status) setTaskStatus(task.id, f.status);
    } else {
      const id = addTask(patch);
      if (f.status && f.status !== 'todo') setTaskStatus(id, f.status);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'} kicker="Task">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <FieldRow label="Title">
          <input autoFocus className="field" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs doing?" />
        </FieldRow>
        <FieldRow label="Notes">
          <textarea className="field" rows={3} value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Context, first step, definition of done" />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Due">
            <input type="date" className="field num" value={f.due ?? ''} onChange={(e) => setF({ ...f, due: e.target.value })} />
          </FieldRow>
          <FieldRow label="Status">
            <select className="field" value={f.status ?? 'todo'} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
              <option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option>
            </select>
          </FieldRow>
        </div>
        <div>
          <span className="label mb-1.5 block">Priority</span>
          <Segmented id="prio" value={String(f.priority ?? 0)} onChange={(v) => setF({ ...f, priority: Number(v) as Priority })}
            options={([0, 1, 2, 3] as Priority[]).map((p) => ({ value: String(p), label: <><span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY[p].color }} />{PRIORITY[p].label}</> }))} />
        </div>
        <FieldRow label="Linked concept">
          <select className="field" value={f.conceptId ?? ''} onChange={(e) => setF({ ...f, conceptId: e.target.value })}>
            <option value="">None</option>
            {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </FieldRow>
        <div className="flex items-center justify-between pt-2">
          {task ? <button type="button" className="btn-danger" onClick={() => { deleteTask(task.id); onClose(); }}><Icon name="trash" size={14} />Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!(f.title ?? '').trim()}>{task ? 'Save' : 'Add task'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
