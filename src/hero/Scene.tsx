import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { heroState } from './state';

const rng = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const VERT = /* glsl */ `
uniform float uTime; uniform float uProgress; uniform vec3 uMouse; uniform float uSize; uniform float uFocus; uniform float uBurst;
attribute vec3 aGalaxy; attribute vec3 aGraph; attribute vec4 aRand;
varying float vAlpha; varying vec3 vColor;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main(){
  float m1 = smoothstep(0.18, 0.46, uProgress);
  float m2 = smoothstep(0.58, 0.86, uProgress);

  // 1. breathing shell that bulges toward the pointer
  vec3 base = position;
  base.xz = rot(uTime * 0.07) * base.xz;
  vec3 dir = normalize(base);
  float n = sin(base.x * 2.3 + uTime * 0.6) * sin(base.y * 2.9 - uTime * 0.45) * sin(base.z * 2.1 + uTime * 0.5);
  vec3 s = base + dir * (n * 0.24 + 0.04 * sin(uTime * 1.2 + aRand.z * 6.283));
  float md = distance(dir, uMouse);
  s += dir * exp(-md * md * 5.0) * 0.5;

  // 2. spiral galaxy with differential rotation
  vec3 g = aGalaxy;
  float r = length(g.xz);
  g.xz = rot(uTime * (0.12 / (0.4 + r * 0.35))) * g.xz;
  g.y += sin(uTime * 0.7 + aRand.w * 6.283) * 0.03;

  // 3. constellation of clustered ideas
  vec3 k = aGraph + 0.05 * vec3(sin(uTime * 0.5 + aRand.x * 20.0), cos(uTime * 0.4 + aRand.y * 20.0), sin(uTime * 0.45 + aRand.z * 20.0));

  float d1 = clamp(m1 * 1.4 - aRand.w * 0.4, 0.0, 1.0); d1 = d1 * d1 * (3.0 - 2.0 * d1);
  float d2 = clamp(m2 * 1.4 - aRand.z * 0.4, 0.0, 1.0); d2 = d2 * d2 * (3.0 - 2.0 * d2);
  vec3 pos = mix(s, g, d1);
  pos = mix(pos, k, d2);
  pos += normalize(pos + 0.001) * uBurst * (2.0 + aRand.x * 9.0);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(0.1, -mv.z);
  float blur = clamp(abs(depth - uFocus) / uFocus, 0.0, 1.0);
  gl_PointSize = uSize * (0.45 + aRand.x) * (1.0 + blur * 3.0) / depth;
  vAlpha = (0.85 - blur * 0.62) * (0.4 + 0.6 * aRand.y);

  vec3 warm = vec3(1.0, 0.58, 0.22);
  vec3 hot = vec3(1.0, 0.9, 0.74);
  vec3 cool = vec3(0.28, 0.85, 0.78);
  vec3 c = mix(warm, hot, smoothstep(0.55, 1.0, aRand.y));
  c = mix(c, cool, step(0.8, aRand.z) * (0.35 + 0.65 * d1));
  vColor = c;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
varying float vAlpha; varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * a * vAlpha * 0.62);
}`;

function buildGeometry(count: number) {
  const rand = rng(7);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
  const sphere = new Float32Array(count * 3);
  const galaxy = new Float32Array(count * 3);
  const graph = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);

  // constellation centres + edges
  const centres: THREE.Vector3[] = [];
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1), rr = 1.2 + Math.cbrt(rand()) * 3.4;
    centres.push(new THREE.Vector3(Math.sin(b) * Math.cos(a) * rr * 1.5, Math.cos(b) * rr * 0.8, Math.sin(b) * Math.sin(a) * rr));
  }
  const edges: [number, number][] = [];
  centres.forEach((c, i) => {
    const near = centres.map((o, j) => ({ j, d: o.distanceTo(c) })).filter((x) => x.j !== i).sort((x, y) => x.d - y.d).slice(0, 2);
    near.forEach(({ j }) => { if (!edges.some(([x, y]) => (x === i && y === j) || (x === j && y === i))) edges.push([i, j]); });
  });

  for (let i = 0; i < count; i++) {
    // sphere: fibonacci shell, some inner layers
    const y = 1 - (i / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5));
    const shell = rand() < 0.78 ? 1.55 + gauss() * 0.05 : 0.5 + rand() * 1.0;
    sphere.set([Math.cos(th) * rad * shell, y * shell, Math.sin(th) * rad * shell], i * 3);

    // galaxy: three arms + bulge
    const gr = Math.pow(rand(), 0.62) * 4.4;
    const arm = Math.floor(rand() * 3);
    const ang = (arm * Math.PI * 2) / 3 + gr * 1.05 + gauss() * (0.55 - gr * 0.06);
    const thick = 0.32 * Math.exp(-gr * 0.55) + 0.03;
    galaxy.set([Math.cos(ang) * gr, gauss() * thick * 2, Math.sin(ang) * gr], i * 3);

    // graph: clouds around centres, plus streams along edges
    if (rand() < 0.2) {
      const [a, b] = edges[Math.floor(rand() * edges.length)];
      const t = rand();
      const p = centres[a].clone().lerp(centres[b], t);
      graph.set([p.x + gauss() * 0.03, p.y + gauss() * 0.03, p.z + gauss() * 0.03], i * 3);
    } else {
      const cc = centres[Math.floor(rand() * centres.length)];
      const sp = 0.1 + rand() * 0.16;
      graph.set([cc.x + gauss() * sp, cc.y + gauss() * sp, cc.z + gauss() * sp], i * 3);
    }
    rnd.set([rand(), rand(), rand(), rand()], i * 4);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sphere, 3));
  geo.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxy, 3));
  geo.setAttribute('aGraph', new THREE.BufferAttribute(graph, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));

  const linePos = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => { linePos.set([...centres[a].toArray(), ...centres[b].toArray()], i * 6); });
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  return { geo, lines };
}

const CAM_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.2, 6.6),
  new THREE.Vector3(2.0, 0.5, 3.9),
  new THREE.Vector3(0.6, 3.4, 6.2),
  new THREE.Vector3(-3.4, 1.6, 7.6),
  new THREE.Vector3(0, 0.3, 11.2),
]);

function Core() {
  const { size, camera, gl } = useThree();
  const count = size.width < 700 ? 14000 : 30000;
  const { geo, lines } = useMemo(() => buildGeometry(count), [count]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uProgress: { value: 0 }, uMouse: { value: new THREE.Vector3(0, 0, 1) },
    uSize: { value: 16 }, uFocus: { value: 6 }, uBurst: { value: 0 },
  }), []);
  // memoised: three caches the uniforms object at first compile, so it must never be replaced
  const coreUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 } }), []);
  const raysUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 } }), []);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.ShaderMaterial>(null);
  const raysRef = useRef<THREE.Mesh>(null);
  const raysMat = useRef<THREE.ShaderMaterial>(null);
  const stars = useRef<THREE.Points>(null);
  const smooth = useRef({ p: 0, mx: 0, my: 0 });
  const target = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const starGeo = useMemo(() => {
    const rand = rng(99);
    const arr = new Float32Array(2600 * 3);
    for (let i = 0; i < 2600; i++) {
      const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1), r = 14 + rand() * 30;
      arr.set([Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    const s = smooth.current;
    const k = 1 - Math.exp(-dt * 4);
    s.p += (heroState.progress - s.p) * k;
    s.mx += (heroState.mx - s.mx) * k;
    s.my += (heroState.my - s.my) * k;
    const t = state.clock.elapsedTime;
    const p = s.p;
    const wide = size.width > 900;

    CAM_PATH.getPoint(Math.min(0.999, Math.max(0, p)), tmp);
    const zoomOut = wide ? 1 : 1.45; // narrow screens need more distance
    camera.position.set(tmp.x * zoomOut + s.mx * 0.5, tmp.y * zoomOut + s.my * 0.3, tmp.z * zoomOut);
    const settle = THREE.MathUtils.smoothstep(p, 0.78, 1);
    // keep the core on the right of the frame while there is copy on the left
    target.set(wide ? -(1.35 + THREE.MathUtils.smoothstep(p, 0.15, 0.4) * 0.75) * (1 - settle) : 0, wide ? 0 : -0.9 * (1 - settle), 0);
    camera.lookAt(target);

    uniforms.uTime.value = t;
    uniforms.uProgress.value = p;
    uniforms.uSize.value = 17 * gl.getPixelRatio() * (wide ? 1 : 0.8);
    uniforms.uFocus.value = camera.position.length();
    uniforms.uBurst.value += (heroState.burst - uniforms.uBurst.value) * (1 - Math.exp(-dt * 2.2));
    // pointer direction on the camera-facing side of the shell
    tmp.set(s.mx * 1.1 + (wide ? 0.35 : 0), s.my * 1.1, 1).normalize().applyQuaternion(camera.quaternion);
    uniforms.uMouse.value.copy(tmp);

    const m1 = THREE.MathUtils.smoothstep(p, 0.18, 0.46);
    const m2 = THREE.MathUtils.smoothstep(p, 0.62, 0.9);
    if (lineMat.current) lineMat.current.opacity = m2 * 0.22 * (1 - uniforms.uBurst.value * 4);
    if (coreRef.current && coreMat.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      coreRef.current.scale.setScalar((0.62 - m1 * 0.3) * pulse);
      coreMat.current.uniforms.uOpacity.value = 1 - m2;
      coreMat.current.uniforms.uTime.value = t;
    }
    if (raysRef.current && raysMat.current) {
      raysRef.current.quaternion.copy(camera.quaternion);
      raysMat.current.uniforms.uTime.value = t;
      raysMat.current.uniforms.uOpacity.value = (1 - m2 * 0.7) * (0.75 + m1 * 0.25);
    }
    if (stars.current) stars.current.rotation.y = t * 0.006;
  });

  return (
    <>
      <points ref={stars} geometry={starGeo}>
        <pointsMaterial size={0.07} sizeAttenuation color="#cfc8ba" transparent opacity={0.55} depthWrite={false} />
      </points>

      <mesh ref={raysRef} renderOrder={-1}>
        <planeGeometry args={[11, 11]} />
        <shaderMaterial ref={raysMat} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending}
          uniforms={raysUniforms}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={`
            uniform float uTime; uniform float uOpacity; varying vec2 vUv;
            void main(){
              vec2 p = vUv - 0.5; float r = length(p); float a = atan(p.y, p.x);
              float rays = 0.5 + 0.5 * sin(a * 7.0 + uTime * 0.17) * sin(a * 13.0 - uTime * 0.11) ;
              rays = pow(rays, 3.0);
              float glow = exp(-r * 14.0) * 0.5 + exp(-r * 3.4) * 0.07 + rays * exp(-r * 5.0) * 0.22;
              glow *= smoothstep(0.5, 0.2, r);
              gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * glow, glow * uOpacity);
            }`} />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial ref={coreMat} transparent depthWrite={false} blending={THREE.AdditiveBlending}
          uniforms={coreUniforms}
          vertexShader={`varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`
            uniform float uTime; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
            void main(){
              // output is sRGB-encoded, so even small linear alphas read bright: keep the body nearly clear, light only the rim
              float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.4);
              vec3 c = mix(vec3(1.0, 0.5, 0.14), vec3(1.0, 0.94, 0.82), f);
              float breathe = 0.5 + 0.5 * sin(uTime * 1.3);
              gl_FragColor = vec4(c, (0.006 + 0.006 * breathe + f * 0.7) * uOpacity);
            }`} />
      </mesh>

      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial ref={lineMat} color="#ffb454" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.1, far: 120, position: [0, 0.2, 6.6] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => gl.setClearColor('#060709')}>
      <Core />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.95} luminanceThreshold={0.12} luminanceSmoothing={0.4} mipmapBlur radius={0.78} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}
