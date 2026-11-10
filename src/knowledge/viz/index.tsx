import { Suspense, lazy } from 'react';
import type { Concept } from '../../data/concepts';
import { ActivationViz, LossFitViz, NetworkViz, NeuronViz, PolyFitViz, PositionalViz, TokenizerViz } from './VizA';
import { AttentionViz, BarsViz, ContextViz, DiffusionViz, NextTokenViz, ScalingViz, StepperViz } from './VizB';

const Surface3D = lazy(() => import('./Viz3D').then((m) => ({ default: m.Surface3D })));
const Embed3D = lazy(() => import('./Viz3D').then((m) => ({ default: m.Embed3D })));

export default function Viz({ viz }: { viz: Concept['viz'] }) {
  const v = viz.variant;
  switch (viz.type) {
    case 'neuron': return <NeuronViz />;
    case 'network': return <NetworkViz variant={v} />;
    case 'activation': return <ActivationViz />;
    case 'lossfit': return <LossFitViz />;
    case 'polyfit': return <PolyFitViz />;
    case 'tokenizer': return <TokenizerViz />;
    case 'positional': return <PositionalViz />;
    case 'attention': return <AttentionViz variant={v} />;
    case 'stepper': return <StepperViz variant={v} />;
    case 'context': return <ContextViz />;
    case 'nexttoken': return <NextTokenViz />;
    case 'bars': return <BarsViz variant={v} />;
    case 'scaling': return <ScalingViz variant={v} />;
    case 'diffusion': return <DiffusionViz />;
    case 'surface3d': return <Suspense fallback={<div className="grid h-[250px] place-items-center"><span className="label animate-pulseSoft">Loading 3D</span></div>}><Surface3D /></Suspense>;
    case 'embed3d': return <Suspense fallback={<div className="grid h-[260px] place-items-center"><span className="label animate-pulseSoft">Loading 3D</span></div>}><Embed3D variant={v} /></Suspense>;
    default: return null;
  }
}
