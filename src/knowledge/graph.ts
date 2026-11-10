import { useMemo } from 'react';
import { CONCEPTS, EDGES, type Concept } from '../data/concepts';
import { useStore, type UserConcept } from '../lib/store';

const toConcept = (u: UserConcept): Concept => ({
  id: u.id, title: u.title, cluster: 'custom', summary: u.summary || 'A concept you added.',
  steps: (u.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 6).map((p, i) => ({ h: i === 0 ? 'Your notes' : `Part ${i + 1}`, p })),
  viz: { type: 'none', caption: '' }, reflect: 'How does this connect to what you already know?', minutes: 3, user: true,
});

export function useKnowledge() {
  const userConcepts = useStore((s) => s.userConcepts);
  const userEdges = useStore((s) => s.userEdges);
  return useMemo(() => {
    const concepts = [...CONCEPTS, ...userConcepts.map(toConcept)];
    const ids = new Set(concepts.map((c) => c.id));
    const edges = [...EDGES, ...userEdges].filter(([a, b]) => ids.has(a) && ids.has(b));
    const byId = new Map(concepts.map((c) => [c.id, c]));
    const neighbours = new Map<string, string[]>();
    concepts.forEach((c) => neighbours.set(c.id, []));
    edges.forEach(([a, b]) => { neighbours.get(a)!.push(b); neighbours.get(b)!.push(a); });
    const isUserEdge = (a: string, b: string) => userEdges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return { concepts, edges, byId, neighbours, isUserEdge };
  }, [userConcepts, userEdges]);
}

/* ------------------------- 3D force-directed layout ------------------------- */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
};

const CLUSTER_ANCHOR: Record<string, [number, number, number]> = {
  foundations: [-5.5, 0.5, 0], representation: [-2, -2.2, 2.2], transformer: [0.5, 1.6, -1], training: [3.2, -1.6, -2.2],
  inference: [4.6, 1.8, 1.8], generative: [-1.5, -3.2, -3], frontier: [1.5, 4, 2.6], custom: [0, -0.5, 4.5],
};

export type Layout = Record<string, [number, number, number]>;

export function computeLayout(concepts: Concept[], edges: [string, string][]): Layout {
  const n = concepts.length;
  const pos = concepts.map((c) => {
    const a = CLUSTER_ANCHOR[c.cluster] ?? [0, 0, 0];
    return [a[0] + (hash(c.id + 'x') - 0.5) * 3, a[1] + (hash(c.id + 'y') - 0.5) * 3, a[2] + (hash(c.id + 'z') - 0.5) * 3];
  });
  const index = new Map(concepts.map((c, i) => [c.id, i]));
  const links = edges.map(([a, b]) => [index.get(a)!, index.get(b)!] as const);
  const REST = 3;
  for (let iter = 0; iter < 320; iter++) {
    const cool = 1 - iter / 320;
    const f = pos.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], dz = pos[i][2] - pos[j][2];
        const d2 = dx * dx + dy * dy + dz * dz + 0.01;
        const d = Math.sqrt(d2);
        const rep = 9 / d2;
        f[i][0] += (dx / d) * rep; f[i][1] += (dy / d) * rep; f[i][2] += (dz / d) * rep;
        f[j][0] -= (dx / d) * rep; f[j][1] -= (dy / d) * rep; f[j][2] -= (dz / d) * rep;
      }
    }
    for (const [a, b] of links) {
      const dx = pos[b][0] - pos[a][0], dy = pos[b][1] - pos[a][1], dz = pos[b][2] - pos[a][2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
      const k = (d - REST) * 0.16;
      f[a][0] += (dx / d) * k; f[a][1] += (dy / d) * k; f[a][2] += (dz / d) * k;
      f[b][0] -= (dx / d) * k; f[b][1] -= (dy / d) * k; f[b][2] -= (dz / d) * k;
    }
    for (let i = 0; i < n; i++) {
      const a = CLUSTER_ANCHOR[concepts[i].cluster] ?? [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        f[i][k] += (a[k] - pos[i][k]) * 0.035 - pos[i][k] * 0.012;
        pos[i][k] += Math.max(-0.6, Math.min(0.6, f[i][k])) * (0.25 + 0.75 * cool);
      }
      pos[i][1] *= 0.995; // keep it slightly flattened: reads better on a wide screen
    }
  }
  const out: Layout = {};
  concepts.forEach((c, i) => { out[c.id] = [pos[i][0], pos[i][1] * 0.82, pos[i][2] * 0.85]; });
  return out;
}
