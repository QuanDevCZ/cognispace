import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CLUSTERS, clusterOf, type ClusterId } from '../data/concepts';
import { useKnowledge } from '../knowledge/graph';
import { useStore } from '../lib/store';
import { Bar, Empty, Icon, PageHead, Panel, cx } from '../ui/kit';

type State = 'all' | 'new' | 'started' | 'mastered';

export default function Library() {
  const { concepts, neighbours } = useKnowledge();
  const progress = useStore((s) => s.progress);
  const setOpenConcept = useStore((s) => s.setOpenConcept);
  const setView = useStore((s) => s.setView);
  const [q, setQ] = useState('');
  const [cluster, setCluster] = useState<ClusterId | 'all'>('all');
  const [state, setState] = useState<State>('all');

  const stateOf = (id: string): Exclude<State, 'all'> => (progress[id]?.mastered ? 'mastered' : progress[id]?.opened ? 'started' : 'new');
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return concepts
      .filter((c) => cluster === 'all' || c.cluster === cluster)
      .filter((c) => state === 'all' || stateOf(c.id) === state)
      .filter((c) => !n || c.title.toLowerCase().includes(n) || c.summary.toLowerCase().includes(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concepts, q, cluster, state, progress]);

  const mastered = concepts.filter((c) => progress[c.id]?.mastered).length;
  const clusters = CLUSTERS.filter((c) => concepts.some((x) => x.cluster === c.id));

  return (
    <>
      <PageHead index="07" kicker="Library" title={<>How modern AI <em className="text-amber">actually</em> works</>}
        sub={`${concepts.length} concepts in ${clusters.length} clusters. ${mastered} mastered. Open any card, or see how they connect in the graph.`}
        right={<button className="btn-ghost" onClick={() => setView('graph')}><Icon name="graph" size={14} />Open the graph</button>} />

      <Panel className="mb-5 !p-4">
        <div className="mb-3 flex items-center justify-between text-[12.5px]"><span className="text-bone-dim">Overall mastery</span><span className="num text-bone">{mastered}<span className="text-bone-faint">/{concepts.length}</span></span></div>
        <Bar value={concepts.length ? mastered / concepts.length : 0} height={4} />
      </Panel>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone-mute" />
          <input className="field !h-9 !rounded-full !pl-9" placeholder="Search concepts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search concepts" />
        </div>
        <select className="field !h-9 !w-auto !rounded-full !text-[13px]" value={state} onChange={(e) => setState(e.target.value as State)} aria-label="Filter by progress">
          <option value="all">Any progress</option><option value="new">Not started</option><option value="started">In progress</option><option value="mastered">Mastered</option>
        </select>
      </div>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: 'all' as const, name: 'All clusters', color: '#ece6da' }, ...clusters].map((c) => (
          <button key={c.id} onClick={() => setCluster(c.id)}
            className={cx('chip !h-8 shrink-0 !px-3 !text-[12.5px] transition-colors', cluster === c.id ? '!border-bone/40 bg-white/[0.06] !text-bone' : 'hover:!text-bone')}>
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Panel><Empty icon="library" title="Nothing on this shelf" body="No concept matches. Clear the search, or add your own concept from the knowledge graph." /></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:gap-4">
          {list.map((c, i) => {
            const cl = clusterOf(c.cluster);
            const st = stateOf(c.id);
            return (
              <motion.button key={c.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03 }}
                whileHover={{ y: -3 }} onClick={() => setOpenConcept(c.id)}
                className="panel group flex flex-col overflow-hidden p-5 text-left transition-colors hover:border-[var(--hair-strong)]">
                <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40" style={{ background: cl.color }} />
                <div className="label relative mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: cl.color }} />{cl.name}</span>
                  <span className={cx(st === 'mastered' ? '!text-ion' : st === 'started' ? '!text-amber' : '')}>
                    {st === 'mastered' ? <span className="flex items-center gap-1"><Icon name="check" size={11} />Mastered</span> : st === 'started' ? 'In progress' : `${c.minutes} min`}
                  </span>
                </div>
                <h3 className="display relative text-[25px] leading-[1.08] text-bone">{c.title}</h3>
                <p className="relative mt-2 flex-1 text-[13px] leading-relaxed text-bone-dim">{c.summary}</p>
                <div className="relative mt-4 flex items-center justify-between text-[11.5px] text-bone-mute">
                  <span className="num">{neighbours.get(c.id)?.length ?? 0} links</span>
                  <span className="flex items-center gap-1.5 text-bone-dim opacity-0 transition-opacity group-hover:opacity-100">Open <Icon name="arrow" size={12} /></span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </>
  );
}
