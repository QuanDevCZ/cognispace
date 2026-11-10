import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect } from 'react';
import Shell from './app/Shell';
import Hero from './hero/Hero';
import { useStore } from './lib/store';

export default function App() {
  const entered = useStore((s) => s.entered);
  const reduced = useStore((s) => s.settings.reducedMotion);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="grain" aria-hidden />
      <AnimatePresence mode="wait">
        {entered ? (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            <Shell />
          </motion.div>
        ) : (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Hero />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
