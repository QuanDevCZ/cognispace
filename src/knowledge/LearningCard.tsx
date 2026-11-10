import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { clusterOf } from '../data/concepts';
import { todayKey } from '../lib/date';
import { useStore } from '../lib/store';
import { Icon, cx } from '../ui/kit';
import { useKnowledge } from './graph';
import Viz from './viz';

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }} className="border-t border-hair py-6">
      <div className="label mb-3 flex items-center gap-2"><span className="text-amber/80">{n}</span><span className="text-bone-faint">/</span>{title}</div>
      {children}
    </motion.section>
  );
}

export default function LearningCard({ id }: { id: string }) {
  const { byId, neighbours, concepts, isUserEdge } = useKnowledge();
  const concept = byId.get(id);
  const p = useStore((s) => s.progress[id]);
  const { setOpenConcept, patchProgress, timerLink, setView, addTask, addEdge, removeEdge, deleteConcept } = useStore.getState();
  const [choice, setChoice] = useState<number | null>(null);
  const [taskAdded, setTaskAdded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { setChoice(null); setTaskAdded(false); scroller.current?.scrollTo({ top: 0 }); }, [id]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-card])')) setOpenConcept(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setOpenConcept]);

  if (!concept) return null;
  const cl = clusterOf(concept.cluster);
  const total = Math.max(1, concept.steps.length);
  const step = Math.min(total, Math.max(1, p?.step ?? 1));
  const allRead = step >= total;
  const links = neighbours.get(id) ?? [];
  const linkable = concepts.filter((c) => c.id !== id && !links.includes(c.id));
  const answered = choice !== null;
  const correct = answered && concept.quiz && choice === concept.quiz.answer;
  const mastered = !!p?.mastered;

  const answer = (i: number) => {
    setChoice(i);
    if (!p?.quiz) patchProgress(id, { quiz: { correct: i === concept.quiz!.answer, at: Date.now() } });
    else if (i === concept.quiz!.answer && !p.quiz.correct) patchProgress(id, { quiz: { ...p.quiz, at: p.quiz.at } });
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" onClick={() => setOpenConcept(null)} />
      <motion.aside role="dialog" aria-modal="true" data-card aria-label={concept.title}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className="relative flex h-full w-full max-w-[600px] flex-col border-l border-hair bg-ink-900 shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.8)]">
        <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-[90px]" style={{ background: cl.color }} />

        {/* top bar */}
        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-hair px-5 py-3.5 sm:px-8">
          <div className="label flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cl.color }} /><span className="truncate">{cl.name}</span>
            <span className="text-bone-faint">&middot;</span><span className="num shrink-0">{concept.minutes} min</span>
            {mastered && <span className="flex shrink-0 items-center gap-1 !text-ion"><Icon name="check" size={11} />Mastered</span>}
          </div>
          <div className="flex items-center gap-1">
            <div className="mr-2 flex gap-1" aria-label={`Read ${step} of ${total} parts`}>
              {Array.from({ length: total }, (_, i) => <span key={i} className={cx('h-1 w-5 rounded-full transition-colors duration-500', i < step ? 'bg-amber' : 'bg-white/10')} />)}
            </div>
            <button className="btn-quiet !h-8 !w-8 !px-0" onClick={() => setOpenConcept(null)} aria-label="Close card"><Icon name="x" /></button>
          </div>
        </div>

        <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-10 sm:px-8">
          <motion.div key={id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="py-7">
            <h2 className="display text-[40px] text-bone sm:text-[50px]">{concept.title}</h2>
            <p className="mt-3 font-display text-[21px] italic leading-snug text-bone-dim">{concept.summary}</p>
          </motion.div>

          {concept.steps.length === 0 && (
            <Section n="01" title="Your notes"><p className="text-[14px] leading-relaxed text-bone-mute">No notes yet. This concept is a placeholder in your graph: a reminder of something worth understanding.</p></Section>
          )}

          {concept.steps.slice(0, 1).map((s) => (
            <Section key={s.h} n="01" title={s.h}><p className="whitespace-pre-line text-[15.5px] leading-[1.7] text-bone">{s.p}</p></Section>
          ))}

          {concept.viz.type !== 'none' && (
            <Section n="··" title="Try it">
              <div className="rounded-[14px] border border-hair bg-ink-850 p-4 sm:p-5"><Viz key={id} viz={concept.viz} /></div>
              <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-bone-mute"><Icon name="spark" size={13} className="mt-0.5 text-amber" />{concept.viz.caption}</p>
            </Section>
          )}

          <AnimatePresence initial={false}>
            {concept.steps.slice(1, step).map((s, i) => (
              <Section key={s.h + i} n={String(i + 2).padStart(2, '0')} title={s.h}><p className="whitespace-pre-line text-[15.5px] leading-[1.7] text-bone">{s.p}</p></Section>
            ))}
          </AnimatePresence>

          {!allRead && (
            <div className="border-t border-hair py-6">
              <button className="group flex w-full items-center justify-between rounded-[12px] border border-dashed border-amber/35 px-5 py-4 text-left transition-colors hover:border-amber hover:bg-amber/[0.05]"
                onClick={() => patchProgress(id, { step: step + 1 })}>
                <span><span className="label block !text-amber">Continue &middot; {step + 1} of {total}</span><span className="mt-1 block font-display text-[22px] italic text-bone">{concept.steps[step].h}</span></span>
                <Icon name="arrow" className="text-amber transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {allRead && concept.quiz && (
            <Section n="Q" title="Check yourself">
              <p className="mb-4 font-display text-[23px] leading-snug text-bone">{concept.quiz.q}</p>
              <ul className="space-y-2">
                {concept.quiz.options.map((o, i) => {
                  const isAnswer = i === concept.quiz!.answer;
                  const show = answered && (i === choice || (isAnswer && correct === false));
                  return (
                    <li key={o}>
                      <button onClick={() => answer(i)} disabled={correct === true}
                        className={cx('flex w-full items-center gap-3 rounded-[11px] border px-4 py-3 text-left text-[14px] transition-all duration-200',
                          show && isAnswer ? 'border-ion/60 bg-ion/[0.08] text-bone' : show ? 'border-ember/60 bg-ember/[0.08] text-bone' : 'border-hair text-bone-dim hover:border-[var(--hair-strong)] hover:text-bone disabled:opacity-50')}>
                        <span className={cx('num grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px]', show && isAnswer ? 'border-ion bg-ion text-ink-950' : show ? 'border-ember bg-ember text-ink-950' : 'border-hair')}>
                          {show ? <Icon name={isAnswer ? 'check' : 'x'} size={12} /> : 'ABCD'[i]}
                        </span>
                        {o}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <AnimatePresence>
                {answered && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden text-[13.5px] leading-relaxed text-bone-dim">
                    <span className="block pt-4"><span className={correct ? 'text-ion' : 'text-ember'}>{correct ? 'Correct.' : 'Not quite.'}</span> {concept.quiz.why}</span>
                  </motion.p>
                )}
              </AnimatePresence>
              {!answered && p?.quiz && <p className="mt-3 text-[12px] text-bone-faint">You answered this before ({p.quiz.correct ? 'correctly' : 'incorrectly'} on the first try). Have another go.</p>}
            </Section>
          )}

          {allRead && (
            <Section n="R" title="Reflect">
              <p className="mb-3 font-display text-[21px] italic leading-snug text-bone">{concept.reflect}</p>
              <textarea className="field" rows={3} placeholder="A sentence or two in your own words. Saved as you type." value={p?.note ?? ''} onChange={(e) => patchProgress(id, { note: e.target.value })} aria-label="Reflection note" />
            </Section>
          )}

          <Section n="↔" title={`Connected to ${links.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {links.length === 0 && <span className="text-[13px] text-bone-mute">Not linked to anything yet.</span>}
              {links.map((l) => {
                const c = byId.get(l)!;
                const mine = isUserEdge(id, l);
                return (
                  <span key={l} className="chip !h-8 !gap-0 !p-0 transition-colors hover:!border-[var(--hair-strong)]">
                    <button className="flex h-full items-center gap-1.5 pl-3 pr-2.5 hover:text-bone" onClick={() => setOpenConcept(l)}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: clusterOf(c.cluster).color }} />{c.title}
                    </button>
                    {mine && <button className="grid h-full w-7 place-items-center border-l border-hair text-bone-faint hover:text-ember" onClick={() => removeEdge(id, l)} aria-label={`Remove link to ${c.title}`}><Icon name="x" size={11} /></button>}
                  </span>
                );
              })}
            </div>
            {linkable.length > 0 && (
              <select className="field mt-3 !h-9 !text-[13px]" value="" onChange={(e) => e.target.value && addEdge(id, e.target.value)} aria-label="Add a connection">
                <option value="">Add a connection…</option>
                {linkable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
          </Section>

          {concept.user && (
            <button className="btn-danger" onClick={() => { if (window.confirm(`Delete "${concept.title}" from your graph?`)) deleteConcept(id); }}><Icon name="trash" size={14} />Delete this concept</button>
          )}
        </div>

        {/* action bar */}
        <div className="relative flex shrink-0 flex-wrap items-center gap-2 border-t border-hair bg-ink-900/95 px-5 py-3.5 sm:px-8">
          <button className={mastered ? 'btn-ghost !border-ion/40 !text-ion' : 'btn-primary'} onClick={() => patchProgress(id, { mastered: mastered ? undefined : Date.now(), step: total })}>
            <Icon name="check" size={14} />{mastered ? 'Mastered' : 'Mark as mastered'}
          </button>
          <button className="btn-ghost" onClick={() => { timerLink({ conceptId: id }); setOpenConcept(null); setView('focus'); }}><Icon name="focus" size={14} />Focus on this</button>
          <button className="btn-ghost" disabled={taskAdded} onClick={() => { addTask({ title: `Study: ${concept.title}`, conceptId: id, due: todayKey(), priority: 2 }); setTaskAdded(true); }}>
            <Icon name={taskAdded ? 'check' : 'plus'} size={14} />{taskAdded ? 'Added to today' : 'Add as task'}
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}
