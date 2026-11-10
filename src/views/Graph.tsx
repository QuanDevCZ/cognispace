import { Billboard, Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CLUSTERS, clusterOf, type ClusterId, type Concept } from '../data/concepts';
import { computeLayout, useKnowledge, type Layout } from '../knowledge/graph';
import { useStore, type Progress } from '../lib/store';
import { FieldRow, Icon, Modal, cx } from '../ui/kit';

/* ------------------------------ 3D scene ------------------------------ */

const EDGE_VERT = /* glsl */ `
attribute float aT; attribute float aSeed; attribute float aHL; attribute vec3 aColor;
varying float vT; varying float vSeed; varying float vHL; varying vec3 vColor;
void main(){ vT = aT; vSeed = aSeed; vHL = aHL; vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const EDGE_FRAG = /* glsl */ `
uniform float uTime; uniform float uActive;
varying float vT; varying float vSeed; varying float vHL; varying vec3 vColor;
void main(){
  float p = fract(uTime * 0.2 + vSeed);
  float d = abs(vT - p); d = min(d, 1.0 - d);
  float pulse = smoothstep(0.1, 0.0, d);
  float a = (0.2 + pulse * 0.8) * mix(1.0, mix(0.1, 1.7, vHL), uActive);
  gl_FragColor = vec4(vColor * (0.75 + pulse * 0.9), a);
}`;

let haloTex: THREE.Texture | null = null;
const getHalo = () => {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
};

interface SceneProps {
  concepts: Concept[];
  edges: [string, string][];
  layout: Layout;
  neighbours: Map<string, string[]>;
  progress: Record<string, Progress>;
  hover: string | null;
  setHover: (id: string | null) => void;
  selected: string | null;
  pending: string | null;
  dim: ClusterId | null;
  onPick: (id: string) => void;
  autoRotate: boolean;
}

function Scene({ concepts, edges, layout, neighbours, progress, hover, setHover, selected, pending, dim, onPick, autoRotate }: SceneProps) {
  const groups = useRef(new Map<string, THREE.Group>());
  const cur = useRef(new Map<string, THREE.Vector3>());
  const labels = useRef(new Map<string, HTMLDivElement>());
  const controls = useRef<any>(null);
  const edgeMat = useRef<THREE.ShaderMaterial>(null);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uActive: { value: 0 } }), []);
  const active = hover ?? pending ?? selected;

  const lit = useMemo(() => {
    if (!active) return null;
    return new Set([active, ...(neighbours.get(active) ?? [])]);
  }, [active, neighbours]);

  const edgeGeo = useMemo(() => {
    const n = edges.length;
    const g = new THREE.BufferGeometry();
    const aT = new Float32Array(n * 2), aSeed = new Float32Array(n * 2), aColor = new Float32Array(n * 6);
    const byId = new Map(concepts.map((c) => [c.id, c]));
    edges.forEach(([a, b], i) => {
      aT.set([0, 1], i * 2);
      const seed = (i * 0.618034) % 1;
      aSeed.set([seed, seed], i * 2);
      const ca = new THREE.Color(clusterOf(byId.get(a)!.cluster).color), cb = new THREE.Color(clusterOf(byId.get(b)!.cluster).color);
      aColor.set([ca.r, ca.g, ca.b, cb.r, cb.g, cb.b], i * 6);
    });
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    g.setAttribute('aHL', new THREE.BufferAttribute(new Float32Array(n * 2), 1));
    return g;
  }, [edges, concepts]);
  useEffect(() => () => edgeGeo.dispose(), [edgeGeo]);

  useEffect(() => {
    const hl = edgeGeo.getAttribute('aHL') as THREE.BufferAttribute;
    edges.forEach(([a, b], i) => {
      const on = active && (a === active || b === active) ? 1 : 0;
      hl.setXY(i, on, on);
    });
    hl.needsUpdate = true;
  }, [active, edges, edgeGeo]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 3.2);
    const camDist = state.camera.position.distanceTo(focus);
    concepts.forEach((c, i) => {
      const base = layout[c.id];
      if (!base) return;
      let p = cur.current.get(c.id);
      if (!p) { p = new THREE.Vector3(base[0] * 0.2, base[1] * 0.2, base[2] * 0.2); cur.current.set(c.id, p); }
      tmp.set(base[0] + Math.sin(t * 0.5 + i * 1.7) * 0.14, base[1] + Math.cos(t * 0.42 + i * 2.3) * 0.16, base[2] + Math.sin(t * 0.37 + i * 0.9) * 0.14);
      p.lerp(tmp, k);
      const g = groups.current.get(c.id);
      // labels on the far side of the graph fade back, so near ones stay readable
      const el = labels.current.get(c.id);
      if (el) {
        const near = (camDist + 1.5 - state.camera.position.distanceTo(p)) / 5;
        const o = c.id === hover || c.id === selected || c.id === pending || lit?.has(c.id) ? 1 : 0.08 + 0.92 * Math.max(0, Math.min(1, near));
        el.style.opacity = o.toFixed(2);
      }
      if (g) {
        g.position.copy(p);
        const want = c.id === hover ? 1.55 : c.id === selected || c.id === pending ? 1.3 : 1;
        g.scale.setScalar(g.scale.x + (want - g.scale.x) * (1 - Math.exp(-dt * 10)));
      }
    });
    const pos = edgeGeo.getAttribute('position') as THREE.BufferAttribute;
    edges.forEach(([a, b], i) => {
      const pa = cur.current.get(a), pb = cur.current.get(b);
      if (pa && pb) { pos.setXYZ(i * 2, pa.x, pa.y, pa.z); pos.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z); }
    });
    pos.needsUpdate = true;
    uniforms.uTime.value = t;
    uniforms.uActive.value += ((active ? 1 : 0) - uniforms.uActive.value) * (1 - Math.exp(-dt * 8));

    const sel = selected ? cur.current.get(selected) : null;
    focus.lerp(sel ?? tmp.set(0, 0, 0), 1 - Math.exp(-dt * 2.5));
    if (controls.current) { controls.current.target.copy(focus); controls.current.update(); }
  });

  const dust = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    let s = 11;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 900; i++) arr.set([(r() - 0.5) * 60, (r() - 0.5) * 40, (r() - 0.5) * 60], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  return (
    <>
      <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.08} minDistance={5} maxDistance={80}
        autoRotate={autoRotate && !hover && !selected} autoRotateSpeed={0.3} rotateSpeed={0.6} zoomSpeed={0.7} />
      <points geometry={dust}><pointsMaterial size={0.06} color="#8f8a80" transparent opacity={0.5} sizeAttenuation depthWrite={false} /></points>

      <lineSegments geometry={edgeGeo} frustumCulled={false}>
        <shaderMaterial ref={edgeMat} uniforms={uniforms} vertexShader={EDGE_VERT} fragmentShader={EDGE_FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>

      {concepts.map((c) => {
        const col = clusterOf(c.cluster).color;
        const deg = neighbours.get(c.id)?.length ?? 0;
        const r = 0.15 + Math.min(deg, 8) * 0.016;
        const faded = (lit && !lit.has(c.id)) || (dim && c.cluster !== dim && !lit?.has(c.id));
        const p = progress[c.id];
        const isHot = c.id === hover || c.id === selected || c.id === pending;
        return (
          <group key={c.id} ref={(g) => { if (g) groups.current.set(c.id, g); else groups.current.delete(c.id); }}>
            <mesh
              onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(c.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = ''; }}
              onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 6) onPick(c.id); }}>
              <sphereGeometry args={[0.5, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[r, 24, 24]} />
              <meshBasicMaterial color={col} transparent opacity={faded ? 0.22 : 1} toneMapped={false} />
            </mesh>
            <sprite scale={[r * 6.5, r * 6.5, 1]}>
              <spriteMaterial map={getHalo()} color={col} transparent opacity={faded ? 0.04 : isHot ? 0.7 : 0.26} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            {(p?.mastered || p?.opened) && (
              <Billboard>
                <mesh>
                  <ringGeometry args={[r + 0.1, r + 0.125, 48, 1, 0, p.mastered ? Math.PI * 2 : Math.PI * 0.9]} />
                  <meshBasicMaterial color={p.mastered ? '#ece6da' : '#ffb454'} transparent opacity={faded ? 0.12 : 0.85} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
              </Billboard>
            )}
            <Html position={[0, -(r + 0.34), 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
              <div ref={(el) => { if (el) labels.current.set(c.id, el); else labels.current.delete(c.id); }}>
                <div className={cx('select-none whitespace-nowrap text-center transition-all duration-300',
                  isHot ? 'font-display text-[19px] italic text-bone' : 'font-mono text-[9.5px] uppercase tracking-[0.14em] max-sm:text-[8px]',
                  !isHot && (faded ? 'text-bone-faint opacity-0' : lit ? 'text-bone opacity-100' : 'text-bone-dim opacity-80'))}
                  style={{ textShadow: '0 0 12px #060709, 0 0 4px #060709' }}>
                  {c.title}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* ------------------------------- overlay ------------------------------ */

function AddConcept({ open, onClose, concepts, onCreated }: { open: boolean; onClose: () => void; concepts: Concept[]; onCreated: (id: string) => void }) {
  const addConcept = useStore((s) => s.addConcept);
  const [f, setF] = useState({ title: '', summary: '', body: '' });
  const [links, setLinks] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const shown = concepts.filter((c) => !q.trim() || c.title.toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!f.title.trim()) return;
    const id = addConcept({ title: f.title.trim(), summary: f.summary.trim(), body: f.body.trim(), links });
    setF({ title: '', summary: '', body: '' }); setLinks([]); setQ('');
    onClose(); onCreated(id);
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a concept" kicker="Knowledge graph" wide>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
        <FieldRow label="Name"><input autoFocus className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Mixture of experts" /></FieldRow>
        <FieldRow label="One-line summary"><input className="field" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="What it is, in a sentence you would say out loud" /></FieldRow>
        <FieldRow label="Notes (blank line starts a new section)"><textarea className="field" rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Explain it in your own words. That is the whole point." /></FieldRow>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><span className="label">Connect to <span className="num text-bone-faint">{links.length}</span></span>
            <input className="h-7 w-40 rounded-full border border-hair bg-ink-900 px-3 text-[12px] placeholder:text-bone-faint focus:border-amber/50 focus:outline-none" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter concepts" /></div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-[10px] border border-hair p-2.5">
            {shown.map((c) => {
              const on = links.includes(c.id);
              return (
                <button type="button" key={c.id} onClick={() => setLinks(on ? links.filter((x) => x !== c.id) : [...links, c.id])} aria-pressed={on}
                  className={cx('chip transition-colors', on ? '!border-amber/60 bg-amber/10 !text-bone' : 'hover:!text-bone')}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: clusterOf(c.cluster).color }} />{c.title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!f.title.trim()}>Add to graph</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Graph() {
  const { concepts, edges, neighbours, isUserEdge } = useKnowledge();
  const progress = useStore((s) => s.progress);
  const selected = useStore((s) => s.openConcept);
  const setOpenConcept = useStore((s) => s.setOpenConcept);
  const reduced = useStore((s) => s.settings.reducedMotion);
  const { addEdge, removeEdge } = useStore.getState();
  const [hover, setHover] = useState<string | null>(null);
  const [dim, setDim] = useState<ClusterId | null>(null);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(concepts, edges), [concepts, edges]);
  const [narrow] = useState(() => window.innerWidth < 700); // a portrait screen needs the camera much further back
  const mastered = concepts.filter((c) => progress[c.id]?.mastered).length;
  const clusters = CLUSTERS.filter((c) => concepts.some((x) => x.cluster === c.id));
  const hovered = hover ? concepts.find((c) => c.id === hover) : null;

  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onPick = (id: string) => {
    if (!linking) { setOpenConcept(id); return; }
    if (!pending) { setPending(id); return; }
    if (pending === id) { setPending(null); return; }
    const exists = edges.some(([a, b]) => (a === pending && b === id) || (a === id && b === pending));
    if (exists && isUserEdge(pending, id)) { removeEdge(pending, id); setToast('Link removed'); }
    else if (exists) setToast('Those two are already linked');
    else { addEdge(pending, id); setToast('Linked'); }
    setPending(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      <Canvas dpr={[1, 1.75]} camera={{ fov: 46, position: narrow ? [0, 5, 58] : [0, 3, 23], near: 0.1, far: 200 }} gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor('#060709')} onPointerMissed={() => { if (linking) setPending(null); }}>
        <fog attach="fog" args={['#060709', narrow ? 60 : 26, narrow ? 110 : 60]} />
        <Scene concepts={concepts} edges={edges} layout={layout} neighbours={neighbours} progress={progress} hover={hover} setHover={setHover}
          selected={selected} pending={pending} dim={dim} onPick={onPick} autoRotate={!reduced} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.18} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      {/* title block */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[min(420px,calc(100%-2rem))] sm:left-8 sm:top-8">
        <div className="label mb-2 flex items-center gap-2"><span className="text-amber/80">06</span><span className="text-bone-faint">/</span>Knowledge graph</div>
        <h1 className="display text-[30px] text-bone sm:text-[44px]">How modern AI <em className="text-amber">actually</em> works</h1>
        <p className="num mt-2 text-[11px] uppercase tracking-[0.16em] text-bone-mute">{concepts.length} concepts &middot; {edges.length} links &middot; {mastered} mastered</p>
      </div>

      {/* actions */}
      <div className="absolute right-4 top-4 z-10 flex gap-2 max-sm:top-auto max-sm:bottom-[76px] sm:right-8 sm:top-8">
        <button className={cx('btn-ghost bg-ink-950/60 backdrop-blur-md', linking && '!border-amber/60 !text-amber')} onClick={() => { setLinking((v) => !v); setPending(null); }} aria-pressed={linking}>
          <Icon name="link" size={14} />{linking ? 'Done linking' : 'Link'}
        </button>
        <button className="btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} />Concept</button>
      </div>

      {/* legend */}
      <div className="absolute bottom-[76px] left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-1.5 max-sm:hidden sm:left-8 lg:bottom-8">
        {clusters.map((c) => {
          const total = concepts.filter((x) => x.cluster === c.id);
          const done = total.filter((x) => progress[x.id]?.mastered).length;
          return (
            <button key={c.id} onClick={() => setDim(dim === c.id ? null : c.id)} aria-pressed={dim === c.id}
              className={cx('chip !h-7 bg-ink-950/60 backdrop-blur-md transition-colors', dim === c.id ? '!border-bone/50 !text-bone' : dim ? 'opacity-50 hover:opacity-100' : 'hover:!text-bone')}>
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}<span className="num text-bone-faint">{done}/{total.length}</span>
            </button>
          );
        })}
      </div>

      <div className="label pointer-events-none absolute right-8 top-[84px] z-10 hidden text-right !text-bone-faint lg:block">
        Drag to orbit &middot; scroll to zoom &middot; click a node<br />ring = mastered &middot; arc = in progress
      </div>

      {/* hover readout */}
      <AnimatePresence>
        {hovered && !selected && (
          <motion.div key={hovered.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="pointer-events-none absolute left-1/2 top-[84px] z-10 hidden w-[340px] -translate-x-1/2 rounded-[12px] border border-hair bg-ink-950/75 p-4 text-center backdrop-blur-md lg:block">
            <div className="label mb-1.5 flex items-center justify-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: clusterOf(hovered.cluster).color }} />{clusterOf(hovered.cluster).name} &middot; {neighbours.get(hovered.id)?.length ?? 0} links</div>
            <p className="text-[13px] leading-relaxed text-bone-dim">{hovered.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* linking banner + toast */}
      <AnimatePresence>
        {(linking || toast) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 top-4 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber/40 bg-ink-950/85 px-4 py-2 text-[12.5px] text-bone backdrop-blur-md max-sm:top-[120px] sm:top-8" role="status">
            {toast ?? (pending ? <>Now pick the concept to link with <em className="text-amber">{concepts.find((c) => c.id === pending)?.title}</em></> : 'Pick the first concept')}
          </motion.div>
        )}
      </AnimatePresence>

      <AddConcept open={adding} onClose={() => setAdding(false)} concepts={concepts} onCreated={(id) => { setToast('Concept added'); setOpenConcept(id); }} />
    </div>
  );
}
