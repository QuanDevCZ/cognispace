import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, keyOf, todayKey } from './date';

export type ViewId =
  | 'today' | 'tasks' | 'habits' | 'goals' | 'week'
  | 'graph' | 'library' | 'focus' | 'analytics' | 'settings';

export type Priority = 0 | 1 | 2 | 3;
export type Status = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  status: Status;
  due?: string;
  conceptId?: string;
  createdAt: number;
  completedAt?: number;
  order: number;
}

export interface Habit {
  id: string;
  name: string;
  cue?: string;
  createdAt: number;
  log: Record<string, true>;
}

export interface Milestone { id: string; title: string; done: boolean; doneAt?: number }
export interface Goal {
  id: string;
  title: string;
  why?: string;
  target?: string;
  milestones: Milestone[];
  createdAt: number;
}

export interface Session {
  id: string;
  start: number;
  minutes: number;
  taskId?: string;
  conceptId?: string;
}

export interface CalEvent { id: string; date: string; start: string; end: string; title: string }

export interface UserConcept { id: string; title: string; summary: string; body: string; createdAt: number }

export interface Progress {
  opened?: number;
  step?: number;
  quiz?: { correct: boolean; at: number };
  mastered?: number;
  note?: string;
}

export interface Settings {
  name: string;
  focusMin: number;
  shortMin: number;
  longMin: number;
  focusTarget: number;
  reducedMotion: boolean;
  sound: boolean;
}

export type TimerMode = 'focus' | 'short' | 'long';
export interface Timer {
  mode: TimerMode;
  running: boolean;
  endsAt?: number;
  remainingMs: number;
  totalMs: number;
  round: number;
  taskId?: string;
  conceptId?: string;
}

interface Data {
  entered: boolean;
  view: ViewId;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  sessions: Session[];
  events: CalEvent[];
  userConcepts: UserConcept[];
  userEdges: [string, string][];
  progress: Record<string, Progress>;
  settings: Settings;
  timer: Timer;
  openConcept: string | null;
}

interface Actions {
  enter: () => void;
  replayIntro: () => void;
  setView: (v: ViewId) => void;
  setOpenConcept: (id: string | null) => void;

  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setTaskStatus: (id: string, status: Status) => void;
  moveTask: (id: string, status: Status, beforeId?: string) => void;
  deleteTask: (id: string) => void;

  addHabit: (name: string, cue?: string) => void;
  toggleHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;

  addGoal: (g: { title: string; why?: string; target?: string; milestones: string[] }) => void;
  addMilestone: (goalId: string, title: string) => void;
  toggleMilestone: (goalId: string, mid: string) => void;
  deleteMilestone: (goalId: string, mid: string) => void;
  deleteGoal: (id: string) => void;

  addEvent: (e: Omit<CalEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;

  addConcept: (c: { title: string; summary: string; body: string; links: string[] }) => string;
  deleteConcept: (id: string) => void;
  addEdge: (a: string, b: string) => void;
  removeEdge: (a: string, b: string) => void;
  patchProgress: (id: string, patch: Partial<Progress>) => void;

  setSettings: (patch: Partial<Settings>) => void;

  timerSetMode: (mode: TimerMode) => void;
  timerLink: (link: { taskId?: string; conceptId?: string }) => void;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: () => void;
  timerComplete: () => void;

  loadDemo: () => void;
  eraseAll: () => void;
  importData: (json: string) => boolean;
  exportData: () => string;
}

export type Store = Data & Actions;

export const uid = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 10);

const defaultSettings: Settings = {
  name: '', focusMin: 25, shortMin: 5, longMin: 15, focusTarget: 90, reducedMotion: false, sound: true,
};

const freshTimer = (s: Settings, mode: TimerMode = 'focus', round = 1): Timer => {
  const min = mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin;
  return { mode, running: false, remainingMs: min * 60000, totalMs: min * 60000, round };
};

/* ----------------------------- demo data ----------------------------- */

const mulberry = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const at = (dayOffset: number, hour: number, minute = 0): number => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

function demoData(): Pick<Data, 'tasks' | 'habits' | 'goals' | 'sessions' | 'events' | 'progress' | 'userConcepts' | 'userEdges'> {
  const rnd = mulberry(20261110);
  const today = todayKey();
  let order = 0;
  const task = (title: string, p: Priority, status: Status, dueOffset: number | null, extra: Partial<Task> = {}): Task => ({
    id: uid(), title, priority: p, status, order: order++,
    due: dueOffset === null ? undefined : addDays(today, dueOffset),
    createdAt: at(-6, 9), ...extra,
  });

  const tasks: Task[] = [
    task('Work through the attention visualisation', 3, 'doing', 0, { conceptId: 'attention', notes: 'Click each token and predict where it will look before revealing.' }),
    task('Write a one-paragraph summary of backpropagation', 2, 'todo', 0, { conceptId: 'backprop' }),
    task('Plan next week on Sunday evening', 1, 'todo', 0),
    task('Review yesterday\'s notes for 10 minutes', 1, 'done', 0, { completedAt: at(0, 8, 10) }),
    task('Draft outline for the study-group talk', 3, 'todo', 1, { notes: 'Three sections: tokens, attention, sampling.' }),
    task('Read about retrieval-augmented generation', 2, 'todo', 2, { conceptId: 'rag' }),
    task('Clean up desktop and inbox', 0, 'todo', 3),
    task('Book a slot to practise the talk out loud', 2, 'todo', 4),
    task('Explain embeddings to a friend without jargon', 2, 'doing', 1, { conceptId: 'embeddings' }),
    task('Someday: build a tiny tokenizer from scratch', 0, 'todo', null, { conceptId: 'tokens' }),
  ];
  // completed history so the charts have a past
  const pastTitles = [
    'Sketch the neuron diagram by hand', 'Finish the gradient descent card', 'Reply to study group', 'Tidy reading list',
    'Summarise "loss functions" in three lines', 'Walk and think: what is a token?', 'Set up weekly review ritual',
    'Quiz myself on activation functions', 'Outline the month', 'Read one long article, no skimming', 'Write down open questions',
    'Rebuild the habit list', 'Compare ReLU and sigmoid', 'Teach-back: neural networks', 'Archive finished notes',
    'Define this quarter\'s goal', 'Draw the transformer block from memory', 'Check in on goal milestones',
  ];
  pastTitles.forEach((title, i) => {
    const day = -1 - Math.floor(i * 0.75);
    tasks.push(task(title, (i % 4) as Priority, 'done', day, { completedAt: at(day, 10 + (i % 8), 15), createdAt: at(day - 2, 9) }));
  });

  const habitDefs: [string, string, number][] = [
    ['Read 20 pages', 'After breakfast', 0.82],
    ['One concept card', 'Before opening any feed', 0.7],
    ['Move for 30 minutes', 'Straight after work', 0.76],
    ['Evening shutdown note', 'Laptop lid closes after', 0.58],
  ];
  const habits: Habit[] = habitDefs.map(([name, cue, rate], hi) => {
    const log: Record<string, true> = {};
    for (let i = 1; i <= 110; i++) {
      // rate ramps up over time so the heatmap tells a story
      const ramp = rate * (0.55 + 0.45 * (1 - i / 110));
      if (rnd() < ramp || i <= 3 - hi) log[addDays(today, -i)] = true;
    }
    if (hi === 0) log[today] = true;
    return { id: uid(), name, cue, createdAt: at(-110, 8), log };
  });

  const goals: Goal[] = [
    {
      id: uid(), title: 'Understand how modern AI works, end to end',
      why: 'Stop nodding along. Be able to explain a transformer on a whiteboard.',
      target: addDays(today, 45), createdAt: at(-20, 9),
      milestones: [
        { id: uid(), title: 'Master the Foundations cluster', done: true, doneAt: at(-9, 18) },
        { id: uid(), title: 'Explain attention without notes', done: true, doneAt: at(-3, 19) },
        { id: uid(), title: 'Master the Transformer cluster', done: false },
        { id: uid(), title: 'Give the study-group talk', done: false },
        { id: uid(), title: 'Write a 1,000-word explainer', done: false },
      ],
    },
    {
      id: uid(), title: 'Build a focus practice that survives busy weeks',
      why: 'Depth is the only thing that compounds.',
      target: addDays(today, 80), createdAt: at(-30, 9),
      milestones: [
        { id: uid(), title: '7-day streak of at least one focus session', done: true, doneAt: at(-12, 20) },
        { id: uid(), title: '10 hours of focus in a single week', done: false },
        { id: uid(), title: '30-day reading streak', done: false },
      ],
    },
  ];

  const sessions: Session[] = [];
  const conceptCycle = ['neuron', 'network', 'gradient-descent', 'backprop', 'tokens', 'embeddings', 'attention'];
  for (let d = -20; d <= -1; d++) {
    const n = rnd() < 0.18 ? 0 : 1 + Math.floor(rnd() * 3.4);
    for (let k = 0; k < n; k++) {
      sessions.push({
        id: uid(), start: at(d, 8 + k * 2, Math.floor(rnd() * 40)), minutes: rnd() < 0.2 ? 50 : 25,
        conceptId: rnd() < 0.6 ? conceptCycle[Math.floor(rnd() * conceptCycle.length)] : undefined,
      });
    }
  }
  sessions.push({ id: uid(), start: at(0, 7, 40), minutes: 25, conceptId: 'attention' });

  const events: CalEvent[] = [
    { id: uid(), date: today, start: '08:00', end: '08:30', title: 'Morning review' },
    { id: uid(), date: today, start: '10:00', end: '11:30', title: 'Deep work: transformer cluster' },
    { id: uid(), date: today, start: '16:30', end: '17:15', title: 'Study group call' },
    { id: uid(), date: addDays(today, 1), start: '09:00', end: '10:00', title: 'Talk outline, first pass' },
    { id: uid(), date: addDays(today, 3), start: '18:00', end: '18:45', title: 'Weekly review' },
  ];

  const progress: Record<string, Progress> = {};
  const done: [string, number][] = [
    ['neuron', -16], ['network', -14], ['activation', -12], ['loss', -10], ['gradient-descent', -9],
    ['backprop', -6], ['tokens', -4], ['embeddings', -2],
  ];
  done.forEach(([id, d]) => {
    progress[id] = { opened: at(d, 18), step: 3, quiz: { correct: true, at: at(d, 18, 20) }, mastered: at(d, 18, 25) };
  });
  progress['attention'] = { opened: at(-1, 19), step: 2 };

  return { tasks, habits, goals, sessions, events, progress, userConcepts: [], userEdges: [] };
}

const emptyData = () => ({
  tasks: [] as Task[], habits: [] as Habit[], goals: [] as Goal[], sessions: [] as Session[],
  events: [] as CalEvent[], progress: {} as Record<string, Progress>,
  userConcepts: [] as UserConcept[], userEdges: [] as [string, string][],
});

/* ------------------------------- store ------------------------------- */

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      entered: false,
      view: 'today',
      openConcept: null,
      settings: defaultSettings,
      timer: freshTimer(defaultSettings),
      ...demoData(),

      enter: () => set({ entered: true }),
      replayIntro: () => set({ entered: false }),
      setView: (view) => set({ view }),
      setOpenConcept: (openConcept) => {
        set({ openConcept });
        if (openConcept) {
          const p = get().progress[openConcept];
          if (!p?.opened) get().patchProgress(openConcept, { opened: Date.now(), step: p?.step ?? 1 });
        }
      },

      addTask: (t) => {
        const id = uid();
        const order = Math.max(-1, ...get().tasks.map((x) => x.order)) + 1;
        set((s) => ({
          tasks: [...s.tasks, { id, priority: 0, status: 'todo', createdAt: Date.now(), order, ...t }],
        }));
        return id;
      },
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      setTaskStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status, completedAt: status === 'done' ? t.completedAt ?? Date.now() : undefined } : t),
        })),
      moveTask: (id, status, beforeId) =>
        set((s) => {
          const moving = s.tasks.find((t) => t.id === id);
          if (!moving) return s;
          const col = s.tasks.filter((t) => t.status === status && t.id !== id).sort((a, b) => a.order - b.order);
          const idx = beforeId ? col.findIndex((t) => t.id === beforeId) : -1;
          const updated: Task = {
            ...moving, status,
            completedAt: status === 'done' ? moving.completedAt ?? Date.now() : undefined,
          };
          if (idx === -1) col.push(updated); else col.splice(idx, 0, updated);
          const orderMap = new Map(col.map((t, i) => [t.id, i]));
          return {
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...updated, order: orderMap.get(id)! } : orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t),
          };
        }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addHabit: (name, cue) => set((s) => ({ habits: [...s.habits, { id: uid(), name, cue, createdAt: Date.now(), log: {} }] })),
      toggleHabit: (id, date) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const log = { ...h.log };
            if (log[date]) delete log[date]; else log[date] = true;
            return { ...h, log };
          }),
        })),
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      addGoal: (g) =>
        set((s) => ({
          goals: [...s.goals, {
            id: uid(), title: g.title, why: g.why, target: g.target, createdAt: Date.now(),
            milestones: g.milestones.filter(Boolean).map((title) => ({ id: uid(), title, done: false })),
          }],
        })),
      addMilestone: (goalId, title) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, milestones: [...g.milestones, { id: uid(), title, done: false }] } : g)),
        })),
      toggleMilestone: (goalId, mid) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: g.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : undefined } : m)) }
              : g),
        })),
      deleteMilestone: (goalId, mid) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === goalId ? { ...g, milestones: g.milestones.filter((m) => m.id !== mid) } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addEvent: (e) => set((s) => ({ events: [...s.events, { ...e, id: uid() }] })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addConcept: (c) => {
        const id = 'u-' + uid();
        set((s) => ({
          userConcepts: [...s.userConcepts, { id, title: c.title, summary: c.summary, body: c.body, createdAt: Date.now() }],
          userEdges: [...s.userEdges, ...c.links.map((l) => [id, l] as [string, string])],
        }));
        return id;
      },
      deleteConcept: (id) =>
        set((s) => {
          const progress = { ...s.progress };
          delete progress[id];
          return {
            userConcepts: s.userConcepts.filter((c) => c.id !== id),
            userEdges: s.userEdges.filter(([a, b]) => a !== id && b !== id),
            progress,
            openConcept: s.openConcept === id ? null : s.openConcept,
          };
        }),
      addEdge: (a, b) =>
        set((s) =>
          a === b || s.userEdges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
            ? s
            : { userEdges: [...s.userEdges, [a, b]] }),
      removeEdge: (a, b) =>
        set((s) => ({ userEdges: s.userEdges.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))) })),
      patchProgress: (id, patch) => set((s) => ({ progress: { ...s.progress, [id]: { ...s.progress[id], ...patch } } })),

      setSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          const lengthsChanged = 'focusMin' in patch || 'shortMin' in patch || 'longMin' in patch;
          return {
            settings,
            timer: lengthsChanged && !s.timer.running
              ? { ...freshTimer(settings, s.timer.mode, s.timer.round), taskId: s.timer.taskId, conceptId: s.timer.conceptId }
              : s.timer,
          };
        }),

      timerSetMode: (mode) =>
        set((s) => ({ timer: { ...freshTimer(s.settings, mode, s.timer.round), taskId: s.timer.taskId, conceptId: s.timer.conceptId } })),
      timerLink: (link) => set((s) => ({ timer: { ...s.timer, taskId: link.taskId, conceptId: link.conceptId } })),
      timerStart: () =>
        set((s) => (s.timer.running ? s : { timer: { ...s.timer, running: true, endsAt: Date.now() + s.timer.remainingMs } })),
      timerPause: () =>
        set((s) =>
          s.timer.running
            ? { timer: { ...s.timer, running: false, endsAt: undefined, remainingMs: Math.max(0, (s.timer.endsAt ?? 0) - Date.now()) } }
            : s),
      timerReset: () =>
        set((s) => {
          const t = s.timer;
          const remaining = t.running ? Math.max(0, (t.endsAt ?? 0) - Date.now()) : t.remainingMs;
          const elapsedMin = Math.floor((t.totalMs - remaining) / 60000);
          const sessions =
            t.mode === 'focus' && elapsedMin >= 1
              ? [...s.sessions, { id: uid(), start: Date.now() - elapsedMin * 60000, minutes: elapsedMin, taskId: t.taskId, conceptId: t.conceptId }]
              : s.sessions;
          return { sessions, timer: { ...freshTimer(s.settings, t.mode, t.round), taskId: t.taskId, conceptId: t.conceptId } };
        }),
      timerComplete: () =>
        set((s) => {
          const t = s.timer;
          const link = { taskId: t.taskId, conceptId: t.conceptId };
          if (t.mode === 'focus') {
            const minutes = Math.round(t.totalMs / 60000);
            const next: TimerMode = t.round % 4 === 0 ? 'long' : 'short';
            return {
              sessions: [...s.sessions, { id: uid(), start: Date.now() - t.totalMs, minutes, ...link }],
              timer: { ...freshTimer(s.settings, next, t.round), ...link },
            };
          }
          return { timer: { ...freshTimer(s.settings, 'focus', t.round + 1), ...link } };
        }),

      loadDemo: () => set((s) => ({ ...demoData(), timer: freshTimer(s.settings), openConcept: null })),
      eraseAll: () => set((s) => ({ ...emptyData(), timer: freshTimer(s.settings), openConcept: null })),
      exportData: () => {
        const { tasks, habits, goals, sessions, events, userConcepts, userEdges, progress, settings } = get();
        return JSON.stringify({ app: 'cognispace', version: 1, exportedAt: new Date().toISOString(), tasks, habits, goals, sessions, events, userConcepts, userEdges, progress, settings }, null, 2);
      },
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          if (d?.app !== 'cognispace' || !Array.isArray(d.tasks)) return false;
          set((s) => ({
            tasks: d.tasks, habits: d.habits ?? [], goals: d.goals ?? [], sessions: d.sessions ?? [],
            events: d.events ?? [], userConcepts: d.userConcepts ?? [], userEdges: d.userEdges ?? [],
            progress: d.progress ?? {}, settings: { ...s.settings, ...(d.settings ?? {}) },
          }));
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'cognispace:v1',
      version: 1,
      partialize: (s) => {
        const { openConcept, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as Store;
      },
    },
  ),
);

/* ------------------------------ selectors ----------------------------- */

export const dayOfTs = (ts: number) => keyOf(new Date(ts));

export const timerRemaining = (t: Timer): number =>
  t.running ? Math.max(0, (t.endsAt ?? 0) - Date.now()) : t.remainingMs;

export function habitStreak(h: Habit, today = todayKey()): { current: number; best: number } {
  let current = 0;
  let cursor = h.log[today] ? today : addDays(today, -1);
  while (h.log[cursor]) { current++; cursor = addDays(cursor, -1); }
  const days = Object.keys(h.log).sort();
  let best = 0, run = 0, prev = '';
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current) };
}

export interface DayScore { total: number; tasks: number; habits: number; focus: number; learning: number; focusMin: number; tasksDone: number; tasksPlanned: number; habitsDone: number }

type ScoreInput = Pick<Data, 'tasks' | 'habits' | 'sessions' | 'progress' | 'settings'>;

/** Day score out of 100: tasks 40, habits 30, focus 20, learning 10. */
export function dayScore(s: ScoreInput, date: string): DayScore {
  const isToday = date === todayKey();
  const doneThatDay = s.tasks.filter((t) => t.completedAt && dayOfTs(t.completedAt) === date);
  const openPlanned = s.tasks.filter(
    (t) => t.status !== 'done' && t.due && (t.due === date || (isToday && t.due < date)));
  const planned = doneThatDay.length + (isToday ? openPlanned.length : 0);
  // past days: three completed tasks counts as a full day
  const tasksRatio = isToday ? (planned ? doneThatDay.length / planned : 0) : Math.min(1, doneThatDay.length / 3);

  const dayEnd = new Date(date + 'T23:59:59').getTime();
  const active = s.habits.filter((h) => h.createdAt <= dayEnd);
  const habitsDone = active.filter((h) => h.log[date]).length;
  const habitsRatio = active.length ? habitsDone / active.length : 0;

  const focusMin = s.sessions.filter((x) => dayOfTs(x.start) === date).reduce((a, x) => a + x.minutes, 0);
  const focusRatio = Math.min(1, focusMin / Math.max(1, s.settings.focusTarget));

  let learning = 0;
  for (const p of Object.values(s.progress)) {
    if ((p.mastered && dayOfTs(p.mastered) === date) || (p.quiz && dayOfTs(p.quiz.at) === date)) learning = 1;
    else if (p.opened && dayOfTs(p.opened) === date) learning = Math.max(learning, 0.5);
  }

  const tasks = Math.round(tasksRatio * 40);
  const habits = Math.round(habitsRatio * 30);
  const focus = Math.round(focusRatio * 20);
  const learn = Math.round(learning * 10);
  return {
    total: tasks + habits + focus + learn, tasks, habits, focus, learning: learn,
    focusMin, tasksDone: doneThatDay.length, tasksPlanned: planned, habitsDone,
  };
}
