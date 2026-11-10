import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { C, Readout, Slider, seeded } from './shared';

/* ----------------------- gradient descent on a surface ----------------------- */

// the +0.13 lifts the lowest dip to about zero, so the loss readout never goes negative
const f = (x: number, y: number) => 0.15 * x * x + 0.6 * y * y + 0.18 * Math.sin(1.6 * x) * Math.cos(1.3 * y) + 0.13;
const grad = (x: number, y: number): [number, number] => [0.3 * x + 0.288 * Math.cos(1.6 * x) * Math.cos(1.3 * y), 1.2 * y - 0.234 * Math.sin(1.6 * x) * Math.sin(1.3 * y)];
const R = 3;
const HS = 0.55; // height scale for display

function Surface({ path }: { path: [number, number][] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(R * 2, R * 2, 56, 56);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color('#12303a'), mid = new THREE.Color('#2a9d8f'), hi = new THREE.Color('#ffb454');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = f(x, z);
      pos.setY(i, h * HS);
      const t = Math.min(1, h / 5);
      c.copy(lo).lerp(mid, Math.min(1, t * 2.4)).lerp(hi, Math.max(0, t * 1.6 - 0.6));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const ball = useRef<THREE.Mesh>(null);
  const shown = useRef(new THREE.Vector3());
  const line = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ece6da', transparent: true, opacity: 0.9 })), []);

  useEffect(() => {
    const pts = path.map(([x, y]) => new THREE.Vector3(x, f(x, y) * HS + 0.04, y));
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
  }, [path, line]);

  useFrame((_, dt) => {
    const last = path[path.length - 1];
    if (!ball.current || !last) return;
    const tx = Math.max(-R - 0.6, Math.min(R + 0.6, last[0])), tz = Math.max(-R - 0.6, Math.min(R + 0.6, last[1]));
    const target = new THREE.Vector3(tx, Math.min(4.5, f(tx, tz) * HS) + 0.13, tz);
    if (path.length === 1) shown.current.copy(target); else shown.current.lerp(target, 1 - Math.exp(-dt * 14));
    ball.current.position.copy(shown.current);
  });

  return (
    <>
      <mesh geometry={geo}><meshBasicMaterial vertexColors transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo}><meshBasicMaterial vertexColors wireframe transparent opacity={0.5} /></mesh>
      <primitive object={line} />
      <mesh ref={ball}>
        <sphereGeometry args={[0.16, 20, 20]} /><meshBasicMaterial color="#fff3df" />
        <mesh><sphereGeometry args={[0.3, 16, 16]} /><meshBasicMaterial color="#ffb454" transparent opacity={0.28} depthWrite={false} /></mesh>
      </mesh>
    </>
  );
}

export function Surface3D() {
  const [lr, setLr] = useState(0.25);
  const [path, setPath] = useState<[number, number][]>([[-2.4, 1.5]]);
  const [run, setRun] = useState(1);
  const lrRef = useRef(lr);
  lrRef.current = lr;

  useEffect(() => {
    const start: [number, number] = run === 1 ? [-2.4, 1.5] : [(Math.random() - 0.5) * 4.6, (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 0.9)];
    setPath([start]);
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setPath((p) => {
        const [x, y] = p[p.length - 1];
        if (Math.abs(x) > R + 0.5 || Math.abs(y) > R + 0.5) { window.clearInterval(id); return p; }
        const [gx, gy] = grad(x, y);
        if (Math.hypot(gx, gy) < 0.004 || n > 70) { window.clearInterval(id); return p; }
        return [...p, [x - lrRef.current * gx, y - lrRef.current * gy]];
      });
    }, 150);
    return () => window.clearInterval(id);
  }, [run]);

  const [x, y] = path[path.length - 1];
  const diverged = Math.abs(x) > R + 0.5 || Math.abs(y) > R + 0.5;
  const loss = f(x, y);
  return (
    <div>
      <div className="relative h-[250px] overflow-hidden rounded-[10px] border border-hair bg-ink-950">
        <Canvas dpr={[1, 1.75]} camera={{ fov: 40, position: [6.6, 6.4, 8] }} gl={{ antialias: true }}>
          <Surface path={path} />
          <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.5} target={[0, 1.1, 0]} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
        {diverged && <span className="absolute left-3 top-3 rounded-full border border-ember/50 bg-ink-950/80 px-3 py-1 text-[11.5px] text-ember">Diverged: the steps were too big</span>}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <Slider label="Learning rate" value={lr} min={0.02} max={1.9} step={0.01} onChange={setLr} />
        <button className="btn-ghost !h-8 shrink-0 !text-[12px]" onClick={() => setRun((r) => r + 1)}>Drop the ball</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Readout k="Steps taken" v={path.length - 1} />
        <Readout k="Loss" v={diverged ? '∞' : loss.toFixed(3)} tone={diverged ? C.ember : loss < 0.05 ? C.ion : C.bone} />
      </div>
      <p className="mt-2 text-[12.5px] text-bone-mute">{lr < 0.1 ? 'Tiny steps: safe, but it may run out of patience before reaching the bottom.' : lr < 0.8 ? 'A sensible rate: quick progress, settling into the valley.' : lr < 1.6 ? 'Too eager: it overshoots and zig-zags across the valley.' : 'Past the limit: each step lands higher than the last.'}</p>
    </div>
  );
}

/* ------------------------------ embedding space ------------------------------ */

interface Pt { label: string; group: number; pos: [number, number, number]; image?: boolean }
const GROUP_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500'];

const SETS: Record<string, { groups: string[]; words: string[][] }> = {
  words: { groups: ['Animals', 'Royalty', 'Food', 'Code'], words: [['cat', 'kitten', 'dog', 'puppy', 'lion'], ['king', 'queen', 'prince', 'throne', 'crown'], ['bread', 'cheese', 'apple', 'soup', 'butter'], ['python', 'loop', 'function', 'bug', 'compile']] },
  latent: { groups: ['Portraits', 'Landscapes', 'Night scenes', 'Sketches'], words: [['smiling face', 'profile', 'old man', 'child'], ['mountains', 'coastline', 'meadow', 'desert'], ['city at night', 'starry sky', 'neon street', 'campfire'], ['pencil cat', 'ink tree', 'charcoal hand', 'doodle']] },
  multimodal: { groups: ['Dog', 'Car', 'Beach', 'Guitar'], words: [['"a dog"', 'photo: dog', '"puppy playing"', 'photo: puppy'], ['"a red car"', 'photo: car', '"traffic"', 'photo: road'], ['"a sunny beach"', 'photo: beach', '"waves"', 'photo: sea'], ['"a guitar"', 'photo: guitar', '"live music"', 'photo: stage']] },
};
const CENTRES: [number, number, number][] = [[-2.1, 0.9, 0.5], [2, 1.2, -0.7], [0.3, -1.5, 1.8], [0.7, -0.3, -2.3]];

function Cloud({ pts, hover, setHover }: { pts: Pt[]; hover: number | null; setHover: (i: number | null) => void }) {
  const near = useMemo(() => {
    if (hover === null) return [] as number[];
    const p = pts[hover].pos;
    return pts.map((q, i) => ({ i, d: Math.hypot(q.pos[0] - p[0], q.pos[1] - p[1], q.pos[2] - p[2]) })).filter((x) => x.i !== hover).sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.i);
  }, [hover, pts]);
  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    if (hover !== null) g.setFromPoints(near.flatMap((i) => [new THREE.Vector3(...pts[hover].pos), new THREE.Vector3(...pts[i].pos)]));
    return g;
  }, [hover, near, pts]);
  return (
    <>
      <lineSegments geometry={lines}><lineBasicMaterial color="#ece6da" transparent opacity={0.7} /></lineSegments>
      {pts.map((p, i) => {
        const lit = hover === null || hover === i || near.includes(i);
        return (
          <group key={p.label} position={p.pos}>
            <mesh onPointerOver={(e) => { e.stopPropagation(); setHover(i); }} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); setHover(i); }} scale={hover === i ? 1.5 : 1}>
              {p.image ? <boxGeometry args={[0.17, 0.17, 0.17]} /> : <sphereGeometry args={[0.1, 16, 16]} />}
              <meshBasicMaterial color={GROUP_COLORS[p.group]} transparent opacity={lit ? 1 : 0.25} />
            </mesh>
            <Html position={[0, 0.24, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[4, 0]}>
              <span className="whitespace-nowrap font-mono text-[9.5px] transition-opacity duration-200" style={{ color: hover === i ? '#fff' : C.dim, opacity: lit ? 1 : 0.15, textShadow: '0 0 6px #060709' }}>{p.label}</span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export function Embed3D({ variant = 'words' }: { variant?: string }) {
  const set = SETS[variant] ?? SETS.words;
  const [hover, setHover] = useState<number | null>(null);
  const pts = useMemo<Pt[]>(() => {
    const r = seeded(variant.length * 13 + 3);
    return set.words.flatMap((ws, g) => ws.map((label, k) => {
      const spread = variant === 'multimodal' ? 0.16 : 0.5;
      // multimodal: text and its matching image sit almost on top of each other
      const pair = variant === 'multimodal' ? Math.floor(k / 2) : k;
      const pr = seeded(g * 100 + pair * 7 + 1);
      const base: [number, number, number] = [CENTRES[g][0] + (pr() - 0.5) * 2, CENTRES[g][1] + (pr() - 0.5) * 1.9, CENTRES[g][2] + (pr() - 0.5) * 2];
      return { label, group: g, image: label.startsWith('photo:'), pos: [base[0] + (r() - 0.5) * spread, base[1] + (r() - 0.5) * spread, base[2] + (r() - 0.5) * spread] as [number, number, number] };
    }));
  }, [set, variant]);
  const h = hover !== null ? pts[hover] : null;
  return (
    <div>
      <div className="h-[260px] overflow-hidden rounded-[10px] border border-hair bg-ink-950">
        <Canvas dpr={[1, 1.75]} camera={{ fov: 42, position: [0, 0.6, 7.2] }} gl={{ antialias: true }} onPointerMissed={() => setHover(null)}>
          <Cloud pts={pts} hover={hover} setHover={setHover} />
          <gridHelper args={[8, 8, '#252932', '#16181d']} position={[0, -2.4, 0]} />
          <OrbitControls enablePan={false} enableZoom={false} autoRotate={hover === null} autoRotateSpeed={0.7} />
        </Canvas>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-bone-mute">
        {set.groups.map((g, i) => <span key={g} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLORS[i] }} />{g}</span>)}
      </div>
      <p className="mt-2 min-h-[36px] text-[12.5px] text-bone-mute">
        {h ? <>Nearest to <span className="text-bone">{h.label}</span>: the three points now joined to it. {variant === 'multimodal' ? 'A caption and its photo land in almost the same place.' : 'Closeness here is similarity of meaning.'}</> : 'Hover or tap a point to find its nearest neighbours. Nobody arranged these groups; training did.'}
      </p>
    </div>
  );
}
