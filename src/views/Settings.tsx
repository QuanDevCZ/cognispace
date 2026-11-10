import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon, PageHead, Panel, PanelHead, Rise } from '../ui/kit';

function NumberRow({ label, hint, value, min, max, step = 1, unit, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="py-3">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span className="text-[14px] text-bone">{label}</span>
        <span className="num text-[14px] text-amber">{value}<span className="ml-1 text-[11px] text-bone-mute">{unit}</span></span>
      </div>
      {hint && <p className="mb-1 text-[12px] text-bone-mute">{hint}</p>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
      <span><span className="block text-[14px] text-bone">{label}</span><span className="block text-[12px] text-bone-mute">{hint}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${value ? 'border-amber bg-amber/25' : 'border-hair bg-ink-900'}`}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full transition-all duration-200 ${value ? 'left-[22px] bg-amber' : 'left-[3px] bg-bone-mute'}`} />
      </span>
    </button>
  );
}

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const { setSettings, replayIntro, exportData, importData, loadDemo, eraseAll } = useStore.getState();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 3500); };

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cognispace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash('Backup downloaded.');
  };

  return (
    <>
      <PageHead index="10" kicker="Settings" title={<>Make it <em className="text-amber">yours</em></>}
        sub="Everything is stored in this browser's localStorage. Nothing is sent anywhere, so a backup file is the only copy outside this device." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Rise>
          <Panel>
            <PanelHead index="A" title="You" />
            <label className="block">
              <span className="label mb-1.5 block">Name, for the greeting</span>
              <input className="field" value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} placeholder="Optional" maxLength={24} />
            </label>
            <div className="mt-3 divide-y divide-white/[0.06]">
              <Toggle label="Reduce motion" hint="Turns off transitions and ambient animation across the app." value={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
              <Toggle label="Timer chime" hint="A soft three-note chime when a round ends." value={settings.sound} onChange={(v) => setSettings({ sound: v })} />
            </div>
            <button className="btn-ghost mt-4" onClick={replayIntro}><Icon name="eye" size={14} />Replay the intro</button>
          </Panel>
        </Rise>

        <Rise i={1}>
          <Panel>
            <PanelHead index="B" title="Focus timer" />
            <div className="divide-y divide-white/[0.06]">
              <NumberRow label="Focus round" value={settings.focusMin} min={5} max={90} step={5} unit="min" onChange={(v) => setSettings({ focusMin: v })} />
              <NumberRow label="Short break" value={settings.shortMin} min={1} max={20} unit="min" onChange={(v) => setSettings({ shortMin: v })} />
              <NumberRow label="Long break" hint="Offered after every fourth focus round." value={settings.longMin} min={5} max={45} step={5} unit="min" onChange={(v) => setSettings({ longMin: v })} />
              <NumberRow label="Daily focus target" hint="Used for the Focus part of the day score." value={settings.focusTarget} min={15} max={360} step={15} unit="min" onChange={(v) => setSettings({ focusTarget: v })} />
            </div>
          </Panel>
        </Rise>

        <Rise i={2} className="lg:col-span-2">
          <Panel>
            <PanelHead index="C" title="Your data" right={msg ? <span className="label !text-ion" role="status">{msg}</span> : undefined} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button className="btn-ghost !h-11 !justify-start" onClick={doExport}><Icon name="download" size={15} />Export backup</button>
              <button className="btn-ghost !h-11 !justify-start" onClick={() => file.current?.click()}><Icon name="upload" size={15} />Import backup</button>
              <button className="btn-ghost !h-11 !justify-start" onClick={() => { if (window.confirm('Replace your current data with the demo data?')) { loadDemo(); flash('Demo data loaded.'); } }}><Icon name="spark" size={15} />Load demo data</button>
              <button className="btn-danger !h-11 !justify-start" onClick={() => { if (window.confirm('Erase all tasks, habits, goals, sessions and learning progress? This cannot be undone.')) { eraseAll(); flash('Everything erased.'); } }}><Icon name="trash" size={15} />Erase everything</button>
            </div>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              flash(importData(await f.text()) ? 'Backup imported.' : 'That file is not a Cognispace backup.');
              e.target.value = '';
            }} />
            <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-bone-mute">
              The app opens with demo data so nothing looks empty. Erase everything to start clean; the seeded AI knowledge graph stays, your progress through it resets.
            </p>
          </Panel>
        </Rise>
      </div>
    </>
  );
}
