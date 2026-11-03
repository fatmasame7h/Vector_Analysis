# VectorLab

Interactive 3D vector analysis & mathematics learning platform.
React + TypeScript + Tailwind CSS + React Router + Three.js (React Three Fiber) + math.js + KaTeX + Jest.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 60 math tests (Jest)
npm run build
```

## Structure
- `src/engines/*` – pure math (coordinates, points, vectors, geometry, surfaces); no UI imports
- `src/visualization` – 3D engine (Scene3D) and object builders
- `src/formulas` – Formula Library data
- `src/components/calc` – shared calculator shell, forms, step-by-step viewer
- `src/pages` – one page per tool

## Deploy
Push to `main`; the workflow in `.github/workflows/deploy.yml` publishes to GitHub Pages
(Settings → Pages → Source: GitHub Actions).
