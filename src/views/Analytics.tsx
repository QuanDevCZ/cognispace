import { useMemo } from 'react';
import { BarChart, LineChart, Meters, Spark, type Datum } from '../charts/Charts';
import { CLUSTERS, CONCEPTS } from '../data/concepts';
import { useKnowledge } from '../knowledge/graph';
import { dayNum, fmtMinutes, fmtShort, lastNDays, weekdayShort } from '../lib/date';
import { dayOfTs, dayScore, habitStreak, useStore } from '../lib/store';
import { Empty, PageHead, Panel, PanelHead, Rise, cx } from '../ui/kit';

function Tile({ label, value, unit, delta, spark, note }: { label: string; value: string | number; unit?: string; delta?: number | null; spark?: number[]; note?: string }) {
  return (
    <Panel className="!p-4 sm:!p-5">
      <div className="label mb-3">{label}</div>
      <div className="flex items-end justify-between gap-3">
        <div className="num text-[34px] leading-none text-bone">{value}{unit && <span className="ml-1 text-[13px] text-bone-mute">{unit}</span>}</div>
        {spark && <Spark values={spark} />}
      </div>
      <div className="mt-3 text-[12px] text-bone-mute">
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={cx('num mr-1.5', delta > 0 ? 'text-ion' : delta < 0 ? 'text-ember' : 'text-bone-mute')}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {Math.abs(delta)}%</span>
        )}
        {note}
      </div>
    </Panel>
  );
}

export default function Analytics() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const { byId } = useKnowledge();

  const d = useMemo(() => {
    const d14 = lastNDays(14), d30 = lastNDays(30);
    const focusBy = new Map<string, number>();
    sessions.forEach((s) => focusBy.set(dayOfTs(s.start), (focusBy.get(dayOfTs(s.start)) ?? 0) + s.minutes));
    const doneBy = new Map<string, number>();
    tasks.forEach((t) => { if (t.completedAt) doneBy.set(dayOfTs(t.completedAt), (doneBy.get(dayOfTs(t.completedAt)) ?? 0) + 1); });

    const lab = (k: string) => `${weekdayShort(k).slice(0, 2)} ${dayNum(k)}`;
    const focus: Datum[] = d14.map((k) => ({ key: k, label: lab(k), value: focusBy.get(k) ?? 0, tip: fmtShort(k) }));
    const done: Datum[] = d14.map((k) => ({ key: k, label: lab(k), value: doneBy.get(k) ?? 0, tip: fmtShort(k) }));
    const score: Datum[] = d30.map((k) => ({ key: k, label: fmtShort(k), value: dayScore({ tasks, habits, sessions, progress, settings }, k).total, tip: fmtShort(k) }));

    const sum = (arr: string[], m: Map<string, number>) => arr.reduce((a, k) => a + (m.get(k) ?? 0), 0);
    const thisW = d14.slice(7), prevW = d14.slice(0, 7);
    const pct = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100));
    const focusThis = sum(thisW, focusBy), focusPrev = sum(prevW, focusBy);
    const doneThis = sum(thisW, doneBy), donePrev = sum(prevW, doneBy);
    const habitRate = (days: string[]) => habits.length ? days.reduce((a, k) => a + habits.filter((h) => h.log[k]).length, 0) / (days.length * habits.length) : 0;
    const mastered = CONCEPTS.filter((c) => progress[c.id]?.mastered).length;
    const quizzes = Object.values(progress).filter((p) => p.quiz);
    const accuracy = quizzes.length ? Math.round((quizzes.filter((p) => p.quiz!.correct).length / quizzes.length) * 100) : null;

    const byConcept = new Map<string, number>();
    sessions.forEach((s) => { if (s.conceptId) byConcept.set(s.conceptId, (byConcept.get(s.conceptId) ?? 0) + s.minutes); });
    const topConcepts = [...byConcept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      focus, done, score, focusThis, doneThis, mastered, accuracy, topConcepts,
      focusDelta: pct(focusThis, focusPrev), doneDelta: pct(doneThis, donePrev),
      habit30: Math.round(habitRate(d30) * 100), habitDelta: pct(habitRate(thisW), habitRate(prevW)),
      avgScore: Math.round(score.slice(-7).reduce((a, x) => a + x.value, 0) / 7),
      totalFocus: sessions.reduce((a, s) => a + s.minutes, 0),
    };
  }, [tasks, habits, sessions, progress, settings]);

  const empty = !tasks.length && !habits.length && !sessions.length && !Object.keys(progress).length;

  return (
    <>
      <PageHead index="09" kicker="Analytics" title={<>What the <em className="text-amber">record</em> says</>}
        sub="Everything here is computed on this device from your own tasks, habits, focus sessions and learning. Hover any chart for the exact numbers." />

      {empty ? (
        <Panel><Empty icon="analytics" title="No signal yet" body="Complete a task, check a habit or run a focus session and this page will start to draw itself." /></Panel>
      ) : (
        <div className="space-y-4 lg:space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            <Rise i={0}><Tile label="Focus, last 7 days" value={fmtMinutes(d.focusThis)} delta={d.focusDelta} note="vs previous 7" spark={d.focus.map((x) => x.value)} /></Rise>
            <Rise i={1}><Tile label="Tasks done, last 7 days" value={d.doneThis} delta={d.doneDelta} note="vs previous 7" spark={d.done.map((x) => x.value)} /></Rise>
            <Rise i={2}><Tile label="Habit consistency" value={d.habit30} unit="%" delta={d.habitDelta} note={d.habitDelta ? 'this week vs last' : 'across the last 30 days'} /></Rise>
            <Rise i={3}><Tile label="Concepts mastered" value={d.mastered} unit={`/ ${CONCEPTS.length}`} note={d.accuracy === null ? 'No quizzes yet' : `${d.accuracy}% first-try quiz accuracy`} /></Rise>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <Rise i={4} className="lg:col-span-7">
              <Panel>
                <PanelHead index="A" title="Day score, last 30 days" right={<span className="label">7-day avg <span className="num text-bone">{d.avgScore}</span></span>} />
                <LineChart data={d.score} max={100} height={230} />
              </Panel>
            </Rise>
            <Rise i={5} className="lg:col-span-5">
              <Panel className="h-full">
                <PanelHead index="B" title="Learning by cluster" />
                <Meters rows={CLUSTERS.filter((c) => c.id !== 'custom').map((c) => {
                  const all = CONCEPTS.filter((x) => x.cluster === c.id);
                  return { key: c.id, label: c.name, color: c.color, total: all.length, value: all.filter((x) => progress[x.id]?.mastered).length };
                })} />
              </Panel>
            </Rise>

            <Rise i={6} className="lg:col-span-7">
              <Panel>
                <PanelHead index="C" title="Focus minutes per day" right={<span className="label">All time <span className="num text-bone">{fmtMinutes(d.totalFocus)}</span></span>} />
                <BarChart data={d.focus} unit=" min" target={settings.focusTarget} targetLabel={`Daily target ${settings.focusTarget}`} height={220} />
              </Panel>
            </Rise>
            <Rise i={7} className="lg:col-span-5">
              <Panel className="h-full">
                <PanelHead index="D" title="Tasks completed per day" />
                <BarChart data={d.done} color="#5fd4c4" height={220} unit=" done" />
              </Panel>
            </Rise>

            <Rise i={8} className="lg:col-span-6">
              <Panel className="h-full">
                <PanelHead index="E" title="Habits, last 30 days" />
                {habits.length === 0 ? <p className="text-[13px] text-bone-mute">No habits to chart yet.</p> : (
                  <Meters rows={habits.map((h) => {
                    const n = lastNDays(30).filter((k) => h.log[k]).length;
                    return { key: h.id, label: `${h.name} · streak ${habitStreak(h).current}`, color: '#5fd4c4', value: n, total: 30, note: `${Math.round((n / 30) * 100)}%` };
                  })} />
                )}
              </Panel>
            </Rise>
            <Rise i={9} className="lg:col-span-6">
              <Panel className="h-full">
                <PanelHead index="F" title="Where focus went" />
                {d.topConcepts.length === 0 ? <p className="text-[13px] leading-relaxed text-bone-mute">Link a focus session to a concept and it will show up here.</p> : (
                  <Meters rows={d.topConcepts.map(([id, min]) => ({ key: id, label: byId.get(id)?.title ?? 'Removed concept', color: '#ffb454', value: min, total: d.topConcepts[0][1], note: fmtMinutes(min) }))} />
                )}
              </Panel>
            </Rise>
          </div>
        </div>
      )}
    </>
  );
}
