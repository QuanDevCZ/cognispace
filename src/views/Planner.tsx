import { DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core';

const underPointer: CollisionDetection = (args) => { const hits = pointerWithin(args); return hits.length ? hits : rectIntersection(args); };
import { useMemo, useState } from 'react';
import { addDays, dayNum, fmtMinutes, fmtShort, monthShort, todayKey, weekStart, weekdayShort } from '../lib/date';
import { dayOfTs, useStore, type Task } from '../lib/store';
import { Check, FieldRow, Icon, Modal, PRIORITY, PageHead, cx } from '../ui/kit';
import { TaskEditor } from './taskparts';

const dragLock = { on: false };

function ChipView({ task, lifted, dim }: { task: Task; lifted?: boolean; dim?: boolean }) {
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const done = task.status === 'done';
  return (
    <div className={cx('flex items-start gap-2 rounded-[9px] border bg-ink-800 px-2.5 py-2 text-[12.5px] leading-snug transition-colors',
        lifted ? 'rotate-[1.5deg] border-amber/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9)]' : 'border-hair hover:border-[var(--hair-strong)]', dim && 'opacity-25')}
      style={{ borderLeftColor: PRIORITY[task.priority].color, borderLeftWidth: 2 }}>
      <span className="mt-[1px]"><Check checked={done} onChange={() => setTaskStatus(task.id, done ? 'todo' : 'done')} size={15} label={`Complete ${task.title}`} /></span>
      <span lang="en" className={cx('min-w-0 flex-1 hyphens-auto break-words', done ? 'text-bone-mute line-through decoration-bone-faint' : 'text-bone')}>{task.title}</span>
    </div>
  );
}

function Chip({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const drag = useDraggable({ id: task.id });
  return (
    <div ref={drag.setNodeRef} {...drag.attributes} {...drag.listeners} onClick={() => { if (!dragLock.on) onOpen(task); }}
      className="cursor-grab touch-manipulation select-none active:cursor-grabbing">
      <ChipView task={task} dim={drag.isDragging} />
    </div>
  );
}

function Day({ day, tasks, onOpen, onAddTask, onAddEvent }: { day: string; tasks: Task[]; onOpen: (t: Task) => void; onAddTask: (day: string) => void; onAddEvent: (day: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}` });
  const allEvents = useStore((s) => s.events);
  const deleteEvent = useStore((s) => s.deleteEvent);
  const sessions = useStore((s) => s.sessions);
  const events = useMemo(() => allEvents.filter((e) => e.date === day).sort((a, b) => a.start.localeCompare(b.start)), [allEvents, day]);
  const focus = useMemo(() => sessions.filter((s) => dayOfTs(s.start) === day).reduce((a, s) => a + s.minutes, 0), [sessions, day]);
  const today = todayKey();
  const isToday = day === today;
  const past = day < today;

  return (
    <div ref={setNodeRef} className={cx('flex min-h-[340px] w-[72vw] shrink-0 snap-center flex-col rounded-[14px] border p-2.5 transition-colors duration-200 sm:w-[240px] xl:w-auto xl:shrink',
      isOver ? 'border-amber/40 bg-amber/[0.04]' : isToday ? 'border-amber/25 bg-ink-850' : 'border-hair bg-ink-900/60', past && !isOver && 'opacity-70')}>
      <div className="mb-3 flex items-start justify-between px-1 pt-1">
        <div>
          <div className={cx('label flex items-center gap-1.5', isToday && '!text-amber')}>{weekdayShort(day)}{isToday && <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_8px_rgba(255,180,84,0.9)]" title="Today" />}</div>
          <div className="display mt-0.5 text-[30px] text-bone">{dayNum(day)}<span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-bone-faint">{monthShort(day)}</span></div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onAddEvent(day)} title="Add a time block" aria-label={`Add a time block on ${fmtShort(day)}`} className="grid h-6 w-6 place-items-center rounded-full text-bone-mute hover:bg-white/5 hover:text-bone"><Icon name="clock" size={13} /></button>
          <button onClick={() => onAddTask(day)} title="Add a task" aria-label={`Add a task on ${fmtShort(day)}`} className="grid h-6 w-6 place-items-center rounded-full text-bone-mute hover:bg-white/5 hover:text-bone"><Icon name="plus" size={13} /></button>
        </div>
      </div>

      {events.length > 0 && (
        <ul className="mb-2 space-y-1">
          {events.map((e) => (
            <li key={e.id} className="group flex items-start gap-2 rounded-[8px] bg-ion/[0.07] px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="num text-[10px] text-ion">{e.start}&ndash;{e.end}</div>
                <div className="break-words text-[12px] leading-snug text-bone-dim">{e.title}</div>
              </div>
              <button aria-label={`Remove ${e.title}`} onClick={() => deleteEvent(e.id)} className="text-bone-faint opacity-0 hover:text-ember focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"><Icon name="x" size={12} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-1 flex-col gap-1.5">
        {tasks.map((t) => <Chip key={t.id} task={t} onOpen={onOpen} />)}
        {tasks.length === 0 && events.length === 0 && (
          <button onClick={() => onAddTask(day)} className="grid flex-1 place-items-center rounded-[10px] border border-dashed border-hair text-[11.5px] text-bone-faint transition-colors hover:border-[var(--hair-strong)] hover:text-bone-mute">
            {past ? 'Nothing logged' : 'Open'}
          </button>
        )}
      </div>
      {focus > 0 && <div className="label mt-2 flex items-center gap-1.5 px-1 !text-bone-faint"><Icon name="focus" size={11} />{fmtMinutes(focus)} focus</div>}
    </div>
  );
}

function Tray({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day:none' });
  return (
    <div ref={setNodeRef} className={cx('mt-4 rounded-[14px] border p-3 transition-colors', isOver ? 'border-amber/40 bg-amber/[0.04]' : 'border-hair bg-ink-900/60')}>
      <div className="label mb-2.5 px-1">Unscheduled <span className="num text-bone-faint">{tasks.length}</span> <span className="normal-case tracking-normal text-bone-faint">&middot; drag onto a day</span></div>
      {tasks.length === 0 ? <p className="px-1 pb-1 text-[12.5px] text-bone-faint">Everything open has a day. Drop a task here to unschedule it.</p> : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{tasks.map((t) => <Chip key={t.id} task={t} onOpen={onOpen} />)}</div>
      )}
    </div>
  );
}

export default function Planner() {
  const tasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const addEvent = useStore((s) => s.addEvent);
  const [anchor, setAnchor] = useState(() => weekStart(todayKey()));
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<Partial<Task> | null>(null);
  const [eventDay, setEventDay] = useState<string | null>(null);
  const [ev, setEv] = useState({ title: '', start: '09:00', end: '10:00' });
  const [dragId, setDragId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    days.forEach((d) => m.set(d, []));
    tasks.forEach((t) => { if (t.due && m.has(t.due)) m.get(t.due)!.push(t); });
    m.forEach((list) => list.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || b.priority - a.priority));
    return m;
  }, [tasks, days]);
  const unscheduled = useMemo(() => tasks.filter((t) => !t.due && t.status !== 'done'), [tasks]);

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    window.setTimeout(() => { dragLock.on = false; }, 80);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over?.startsWith('day:')) return;
    const day = over.slice(4);
    updateTask(String(e.active.id), { due: day === 'none' ? undefined : day });
  };

  const isThisWeek = anchor === weekStart(todayKey());
  const dragging = dragId ? tasks.find((t) => t.id === dragId) : null;
  const weekTasks = days.flatMap((d) => byDay.get(d) ?? []);

  return (
    <>
      <PageHead index="05" kicker="Week" title={<>{fmtShort(days[0])} <span className="text-bone-faint">&ndash;</span> <em className="text-amber">{fmtShort(days[6])}</em></>}
        sub={`${weekTasks.filter((t) => t.status !== 'done').length} open and ${weekTasks.filter((t) => t.status === 'done').length} done this week. Drag a task to give it a day.`}
        right={<>
          <button className="btn-ghost !w-9 !px-0" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week"><Icon name="back" size={14} /></button>
          <button className="btn-ghost" onClick={() => setAnchor(weekStart(todayKey()))} disabled={isThisWeek}>This week</button>
          <button className="btn-ghost !w-9 !px-0" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week"><Icon name="arrow" size={14} /></button>
        </>} />

      <DndContext sensors={sensors} collisionDetection={underPointer} onDragStart={(e) => { dragLock.on = true; setDragId(String(e.active.id)); }} onDragEnd={onDragEnd} onDragCancel={() => { dragLock.on = false; setDragId(null); }}>
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8 xl:mx-0 xl:grid xl:grid-cols-7 xl:overflow-visible xl:px-0">
          {days.map((d) => (
            <Day key={d} day={d} tasks={byDay.get(d) ?? []} onOpen={setEditing} onAddTask={(day) => setCreating({ due: day })} onAddEvent={setEventDay} />
          ))}
        </div>
        <Tray tasks={unscheduled} onOpen={setEditing} />
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }}>{dragging && <ChipView task={dragging} lifted />}</DragOverlay>
      </DndContext>

      <TaskEditor task={editing} create={creating} onClose={() => { setEditing(null); setCreating(null); }} />

      <Modal open={!!eventDay} onClose={() => setEventDay(null)} title="Block time" kicker={eventDay ? fmtShort(eventDay) : ''}>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!ev.title.trim() || !eventDay) return;
          addEvent({ date: eventDay, title: ev.title.trim(), start: ev.start, end: ev.end < ev.start ? ev.start : ev.end });
          setEv({ ...ev, title: '' }); setEventDay(null);
        }}>
          <FieldRow label="What is this time for?"><input autoFocus className="field" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="Deep work" /></FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Start"><input type="time" className="field num" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} /></FieldRow>
            <FieldRow label="End"><input type="time" className="field num" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} /></FieldRow>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setEventDay(null)}>Cancel</button>
            <button className="btn-primary" disabled={!ev.title.trim()}>Add block</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
