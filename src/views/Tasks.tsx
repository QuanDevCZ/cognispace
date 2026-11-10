import { DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { addDays, todayKey } from '../lib/date';
import { useStore, type Status, type Task } from '../lib/store';
import { Empty, Icon, PageHead, Panel, PriorityMark, Segmented, cx } from '../ui/kit';
import { ConceptChip, DueChip, QuickAdd, TaskEditor, TaskRow } from './taskparts';

type DueFilter = 'all' | 'today' | 'week' | 'overdue' | 'none';
type PrioFilter = 'all' | '3' | '2' | '1';

const COLS: { id: Status; label: string; hint: string }[] = [
  { id: 'todo', label: 'To do', hint: 'Drop here to queue it' },
  { id: 'doing', label: 'In progress', hint: 'Keep this column short' },
  { id: 'done', label: 'Done', hint: 'Drop here to finish it' },
];

/** Drop target = whatever is under the pointer (a card wins over its column), not whatever the lifted card overlaps most. */
const underPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (!hits.length) return rectIntersection(args);
  const cards = hits.filter((h) => String(h.id).startsWith('card:'));
  return cards.length ? cards : hits;
};

/** Swallows the click that follows a drop so a drag never opens the editor. */
const dragLock = { on: false };

function CardBody({ task, lifted }: { task: Task; lifted?: boolean }) {
  return (
    <div className={cx('rounded-[11px] border bg-ink-800 p-3.5 transition-[border-color,box-shadow] duration-200',
      lifted ? 'rotate-[1.5deg] border-amber/50 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)]' : 'border-hair hover:border-[var(--hair-strong)]')}>
      <div className="flex items-start justify-between gap-3">
        <p className={cx('text-[13.5px] leading-snug', task.status === 'done' ? 'text-bone-mute line-through decoration-bone-faint' : 'text-bone')}>{task.title}</p>
        <span className="mt-0.5 shrink-0"><PriorityMark p={task.priority} /></span>
      </div>
      {(task.due || task.conceptId) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <ConceptChip id={task.conceptId} />
          <span className="ml-auto"><DueChip task={task} /></span>
        </div>
      )}
    </div>
  );
}

function Card({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const drag = useDraggable({ id: task.id });
  const drop = useDroppable({ id: `card:${task.id}` });
  return (
    <motion.div layout="position" transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      ref={(el) => { drag.setNodeRef(el); drop.setNodeRef(el); }}
      {...drag.attributes} {...drag.listeners}
      onClick={() => { if (!dragLock.on) onOpen(task); }}
      className={cx('relative cursor-grab touch-manipulation select-none active:cursor-grabbing', drag.isDragging && 'opacity-25')}>
      {drop.isOver && !drag.isDragging && <span className="absolute -top-[5px] left-1 right-1 h-[2px] rounded bg-amber shadow-[0_0_8px_rgba(255,180,84,0.8)]" />}
      <CardBody task={task} />
    </motion.div>
  );
}

function Column({ col, tasks, onOpen, onAdd }: { col: (typeof COLS)[number]; tasks: Task[]; onOpen: (t: Task) => void; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` });
  return (
    <div ref={setNodeRef} className={cx('flex min-h-[320px] w-[82vw] shrink-0 snap-center flex-col rounded-[14px] border p-3 transition-colors duration-200 sm:w-auto sm:shrink',
      isOver ? 'border-amber/40 bg-amber/[0.04]' : 'border-hair bg-ink-900/60')}>
      <div className="mb-3 flex items-center justify-between px-1.5 pt-1">
        <span className="label flex items-center gap-2">
          <span className={cx('h-1.5 w-1.5 rounded-full', col.id === 'todo' ? 'bg-bone-mute' : col.id === 'doing' ? 'bg-amber' : 'bg-ion')} />
          {col.label}<span className="num text-bone-faint">{tasks.length}</span>
        </span>
        {col.id !== 'done' && <button onClick={onAdd} aria-label={`Add to ${col.label}`} className="grid h-6 w-6 place-items-center rounded-full text-bone-mute hover:bg-white/5 hover:text-bone"><Icon name="plus" size={13} /></button>}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((t) => <Card key={t.id} task={t} onOpen={onOpen} />)}
        {tasks.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-[10px] border border-dashed border-hair px-4 text-center text-[12px] text-bone-faint">{col.hint}</div>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const moveTask = useStore((s) => s.moveTask);
  const [mode, setMode] = useState<'list' | 'board'>('board');
  const [q, setQ] = useState('');
  const [due, setDue] = useState<DueFilter>('all');
  const [prio, setPrio] = useState<PrioFilter>('all');
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<Partial<Task> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const today = todayKey();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const weekEnd = addDays(today, 7);
    return tasks
      .filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.notes?.toLowerCase().includes(needle))
      .filter((t) => prio === 'all' || t.priority === Number(prio))
      .filter((t) =>
        due === 'all' ? true : due === 'none' ? !t.due : due === 'today' ? t.due === today
          : due === 'week' ? !!t.due && t.due >= today && t.due <= weekEnd : !!t.due && t.due < today && t.status !== 'done')
      .sort((a, b) => a.order - b.order);
  }, [tasks, q, due, prio, today]);

  const groups = useMemo(() => {
    const open = filtered.filter((t) => t.status !== 'done');
    const byPrio = (a: Task, b: Task) => (a.due ?? '9').localeCompare(b.due ?? '9') || b.priority - a.priority;
    return [
      { k: 'Overdue', tone: 'text-ember', items: open.filter((t) => t.due && t.due < today).sort(byPrio) },
      { k: 'Today', tone: 'text-amber', items: open.filter((t) => t.due === today).sort(byPrio) },
      { k: 'Upcoming', tone: '', items: open.filter((t) => t.due && t.due > today).sort(byPrio) },
      { k: 'Someday', tone: '', items: open.filter((t) => !t.due).sort(byPrio) },
    ].filter((g) => g.items.length);
  }, [filtered, today]);
  const doneList = useMemo(() => filtered.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [filtered]);

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    window.setTimeout(() => { dragLock.on = false; }, 80);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const id = String(e.active.id);
    if (over.startsWith('col:')) moveTask(id, over.slice(4) as Status);
    else if (over.startsWith('card:')) {
      const target = tasks.find((t) => t.id === over.slice(5));
      if (target && target.id !== id) moveTask(id, target.status, target.id);
    }
  };

  const openCount = tasks.filter((t) => t.status !== 'done').length;
  const filtersOn = q || due !== 'all' || prio !== 'all';
  const dragging = dragId ? tasks.find((t) => t.id === dragId) : null;

  return (
    <>
      <PageHead index="02" kicker="Tasks" title={<>What needs <em className="text-amber">doing</em></>}
        sub={`${openCount} open, ${tasks.length - openCount} done. Drag cards between columns, or switch to the list.`}
        right={<>
          <Segmented id="taskmode" value={mode} onChange={setMode} options={[
            { value: 'board', label: <><Icon name="board" size={13} />Board</> }, { value: 'list', label: <><Icon name="list" size={13} />List</> }]} />
          <button className="btn-primary" onClick={() => setCreating({ due: today })}><Icon name="plus" size={14} />New task</button>
        </>} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-mute" />
          <input className="field !h-9 !rounded-full !pl-9" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" />
        </div>
        <select className="field !h-9 !w-auto !rounded-full !text-[13px]" value={due} onChange={(e) => setDue(e.target.value as DueFilter)} aria-label="Filter by due date">
          <option value="all">Any date</option><option value="today">Due today</option><option value="week">Next 7 days</option><option value="overdue">Overdue</option><option value="none">No date</option>
        </select>
        <select className="field !h-9 !w-auto !rounded-full !text-[13px]" value={prio} onChange={(e) => setPrio(e.target.value as PrioFilter)} aria-label="Filter by priority">
          <option value="all">Any priority</option><option value="3">High</option><option value="2">Medium</option><option value="1">Low</option>
        </select>
        {filtersOn && <button className="btn-quiet !h-9 !text-[12.5px]" onClick={() => { setQ(''); setDue('all'); setPrio('all'); }}><Icon name="x" size={12} />Clear</button>}
      </div>

      {tasks.length === 0 ? (
        <Panel><Empty icon="tasks" title="A blank page" body="Nothing here yet. Capture the first thing on your mind; you can sort it out later."
          action={<button className="btn-primary" onClick={() => setCreating({})}><Icon name="plus" size={14} />New task</button>} /></Panel>
      ) : filtered.length === 0 ? (
        <Panel><Empty icon="search" title="No matches" body="No task fits these filters. Loosen one and try again." /></Panel>
      ) : mode === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={underPointer} onDragStart={(e) => { dragLock.on = true; setDragId(String(e.active.id)); }} onDragEnd={onDragEnd} onDragCancel={() => { dragLock.on = false; setDragId(null); }}>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
            {COLS.map((c) => (
              <Column key={c.id} col={c} onOpen={setEditing} onAdd={() => setCreating({ status: c.id, due: today })}
                tasks={filtered.filter((t) => t.status === c.id).slice(0, c.id === 'done' ? 12 : undefined)} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }}>
            {dragging && <CardBody task={dragging} lifted />}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-4">
          <QuickAdd />
          {groups.map((g) => (
            <Panel key={g.k} className="!p-3 sm:!p-4">
              <div className={cx('label mb-1 px-2.5 pt-1', g.tone)}>{g.k} <span className="num text-bone-faint">{g.items.length}</span></div>
              <ul><AnimatePresence initial={false}>{g.items.map((t) => <TaskRow key={t.id} task={t} onOpen={setEditing} />)}</AnimatePresence></ul>
            </Panel>
          ))}
          {doneList.length > 0 && (
            <Panel className="!p-3 sm:!p-4">
              <button className="label flex w-full items-center justify-between px-2.5 py-1 hover:text-bone" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                <span>Done <span className="num text-bone-faint">{doneList.length}</span></span><span>{showDone ? 'Hide' : 'Show'}</span>
              </button>
              {showDone && <ul className="mt-1"><AnimatePresence initial={false}>{doneList.map((t) => <TaskRow key={t.id} task={t} onOpen={setEditing} />)}</AnimatePresence></ul>}
            </Panel>
          )}
        </div>
      )}

      <TaskEditor task={editing} create={creating} onClose={() => { setEditing(null); setCreating(null); }} />
    </>
  );
}
