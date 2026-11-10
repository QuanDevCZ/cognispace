import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Priority } from '../lib/store';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/* -------------------------------- icons -------------------------------- */

const PATHS: Record<string, string> = {
  today: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  tasks: 'M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10',
  habits: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4z',
  goals: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  week: 'M4 5h16v15H4zM4 10h16M9 5v15M15 5v15',
  graph: 'M6 7a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM8 21a2 2 0 100-4 2 2 0 000 4zM17 20a2 2 0 100-4 2 2 0 000 4zM7.8 5.6l8.4 1M6.4 7l1.2 10M9.8 18.7l5.4-.5M17.6 9l-.4 7M8.9 17.4l7.7-9',
  library: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 5.2l3.8-1 3.2 14.6-3.8 1z',
  focus: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  analytics: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM9 19.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v5M14 11v5',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 12a8 8 0 108-8H7M7 4L4 7l3 3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1',
  flame: 'M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.3-2.2-4.7-3-7.3-1.6 1-2.3 2.4-2.4 3.9C11.6 9.700 11 7 11.500 3 8 5 5.500 9.300 5.500 14.200 5.500 18.100 8.100 21 12 21z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  spark: 'M12 3l1.8 5.600L19.500 10l-5.700 1.400L12 17l-1.800-5.600L4.500 10l5.700-1.400z',
  list: 'M4 6h16M4 12h16M4 18h16',
  board: 'M4 4h5v16H4zM10.500 4h5v10h-5zM17 4h3v13h-3z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  eye: 'M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12zM12 14.500a2.500 2.500 0 100-5 2.500 2.500 0 000 5z',
};

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)} aria-hidden>
      <path d={PATHS[name] ?? PATHS.spark} />
    </svg>
  );
}

/* ------------------------------- layout -------------------------------- */

export function Panel({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={cx('panel', pad && 'p-5 sm:p-6', className)}>{children}</section>;
}

export function PanelHead({ index, title, right }: { index?: string; title: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="label flex items-center gap-2">
        {index && <span className="text-amber/80">{index}</span>}
        {index && <span className="text-bone-faint">/</span>}
        <span>{title}</span>
      </div>
      {right}
    </header>
  );
}

export function PageHead({ index, kicker, title, sub, right }: { index: string; kicker: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <div className="label mb-3 flex items-center gap-2">
          <span className="text-amber/80">{index}</span><span className="text-bone-faint">/</span><span>{kicker}</span>
        </div>
        <h1 className="display text-[40px] sm:text-[54px] text-bone">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-bone-dim">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </motion.header>
  );
}

export function Empty({ icon = 'spark', title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-full border border-hair text-amber/80">
        <span className="absolute inset-0 animate-pulseSoft rounded-full border border-amber/20" style={{ transform: 'scale(1.35)' }} />
        <Icon name={icon} size={20} />
      </div>
      <p className="font-display text-[22px] italic text-bone">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-bone-mute">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------ controls ------------------------------- */

export function Check({ checked, onChange, color = '#ffb454', size = 20, label }: { checked: boolean; onChange: () => void; color?: string; size?: number; label?: string }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="relative grid shrink-0 place-items-center rounded-full border transition-colors duration-200 hover:border-[var(--hair-strong)]"
      style={{ width: size, height: size, borderColor: checked ? color : 'rgba(236,230,218,0.22)', background: checked ? color : 'transparent' }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#060709" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.500l4.500 4.500L19 7.500" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: 0.22 }} />
      </svg>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-full border border-hair bg-ink-900 p-[3px]">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('relative h-full rounded-full px-3.500 text-[12.500px] font-medium transition-colors', value === o.value ? 'text-ink-950' : 'text-bone-mute hover:text-bone')}
          style={{ paddingInline: 14 }}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-bone" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export const PRIORITY: Record<Priority, { label: string; color: string }> = {
  0: { label: 'None', color: '#45434a' },
  1: { label: 'Low', color: '#5fd4c4' },
  2: { label: 'Medium', color: '#ffb454' },
  3: { label: 'High', color: '#ff6b5e' },
};

export function PriorityMark({ p }: { p: Priority }) {
  return (
    <span className="inline-flex items-end gap-[2px]" title={`Priority: ${PRIORITY[p].label}`} aria-label={`Priority ${PRIORITY[p].label}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className="w-[3px] rounded-sm" style={{ height: 4 + i * 3, background: i <= p ? PRIORITY[p].color : 'rgba(236,230,218,0.12)' }} />
      ))}
    </span>
  );
}

export function Ring({ value, size = 120, stroke = 6, color = '#ffb454', children, track = 'rgba(236,230,218,0.08)' }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = '#ffb454', height = 4 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }} />
    </div>
  );
}

/* -------------------------------- modal -------------------------------- */

export function Modal({ open, onClose, title, kicker, children, wide }: { open: boolean; onClose: () => void; title: string; kicker?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label={title}
            initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={cx('panel relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-[14px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
            style={{ background: '#0e1014' }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                {kicker && <div className="label mb-2">{kicker}</div>}
                <h2 className="display text-[30px]">{title}</h2>
              </div>
              <button className="btn-quiet !h-8 !w-8 !px-0" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

/** Staggered entrance wrapper for page sections. */
export function Rise({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.05 + i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
