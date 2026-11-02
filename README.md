# VectorLab

3D vector analysis & interactive mathematics learning platform.
Stack: React, TypeScript, Tailwind CSS, React Router (Three.js / React Three Fiber, Jest and KaTeX are added in later steps).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Structure
- `src/engines/*` — pure math (no UI imports)
- `src/visualization` — 3D engine
- `src/formulas` — Formula Library data
- `src/components`, `src/pages` — UI

## Progress
- [x] Step 1: project structure, routing, layouts
- [ ] Step 2: math engines + Jest tests
- [ ] Step 3: 3D visualization engine
- [ ] Step 4: pages and tools
