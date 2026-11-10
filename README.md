# Cognispace

A planner, a focus timer and a 3D map of what you know, in one page. It runs in the browser and keeps everything on your device.

**Live:** https://quandevcz.github.io/cognispace/

Run it locally:

```bash
npm install && npm run dev
```

Then open the address Vite prints (usually http://localhost:5199).

## What is in it

**The intro.** A scroll-driven 3D scene. About 30,000 particles start as a sphere, turn into a spiral galaxy, then into a constellation of linked ideas. It reacts to the mouse. "Skip intro" is always there, and you only see the intro on the first visit.

**Plan**
- Today: a day score out of 100 (tasks 40, habits 30, focus 20, learning 10) that tells you which single action would raise it most
- Tasks: board and list, priorities, due dates, filters, drag and drop
- Habits: streaks and an 18-week heatmap per habit. Click any past day to fix it
- Goals: milestones and a target date
- Week: drag tasks between days, add timed blocks

**Learn**
- Knowledge Graph: 28 concepts on "How modern AI actually works" and the 51 links between them, in 3D. Click a node to open its card
- Each card has a three-part explanation, something to play with, a quiz and a reflection note
- 16 interactive pieces, for example: tune a neuron, drop a ball on a 3D loss surface, click a word to see what it attends to, slide the temperature, watch an image come out of noise
- Add your own concepts and links
- Library: the same concepts as a searchable list

**Focus.** A Pomodoro timer you can link to a task or a concept. It keeps running when you switch views or refresh the page.

**Analytics.** Day score over 30 days, focus minutes, tasks done, habit rates, learning per cluster.

**Settings.** Timer lengths, daily focus target, reduced motion, export and import a JSON backup, erase everything.

## Good to know

- No backend, no account, no network calls. All data lives in `localStorage` under the key `cognispace:v1`. Clearing site data deletes it, so export a backup if you care about it.
- The app opens with demo data so nothing looks empty. Settings → "Erase everything" gives you a clean start.
- Number keys 1 to 0 switch views.
- The tokenizer, the attention weights and the probability bars in the learning cards are simplified to show the idea. They are not output from a real model.

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, three.js with React Three Fiber, Lenis, zustand, dnd-kit. Fonts come from npm (`@fontsource`), so it works offline after install. Charts are plain SVG.

```bash
npm run build     # typecheck + production build into dist/
npm run preview   # serve the build
```

Every push to `main` builds the site and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Layout of the code

```
src/
  hero/        intro: Scene.tsx (WebGL), Hero.tsx (scroll + typography)
  app/         Shell.tsx: sidebar, mobile tab bar, view switching
  views/       one file per view
  knowledge/   graph layout, LearningCard, viz/ (the interactive pieces)
  data/        concepts.ts: the seeded AI graph and its text
  lib/         store.ts (all state + persistence), date helpers, hooks
  charts/      SVG charts
  ui/          shared components
```

`plan.txt` holds the original build plan.
