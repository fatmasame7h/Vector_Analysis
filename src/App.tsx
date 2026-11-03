import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';

const page = (p: () => Promise<{ default: React.ComponentType }>) => lazy(p);
const PointConversion = page(() => import('./pages/PointConversion'));
const PointOperations = page(() => import('./pages/PointOperations'));
const VectorConversion = page(() => import('./pages/VectorConversion'));
const VectorOperations = page(() => import('./pages/VectorOperations'));
const PointExplorer = page(() => import('./pages/PointExplorer'));
const GeometryExplorer = page(() => import('./pages/GeometryExplorer'));
const CoordinateSurfaces = page(() => import('./pages/CoordinateSurfaces'));
const Solver = page(() => import('./pages/Solver'));
const Visualizer = page(() => import('./pages/Visualizer'));
const FormulaLibrary = page(() => import('./pages/FormulaLibrary'));
const History = page(() => import('./pages/History'));

export default function App() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/point-conversion" element={<PointConversion />} />
          <Route path="/point-operations" element={<PointOperations />} />
          <Route path="/vector-conversion" element={<VectorConversion />} />
          <Route path="/vector-operations" element={<VectorOperations />} />
          <Route path="/point-explorer" element={<PointExplorer />} />
          <Route path="/geometry-explorer" element={<GeometryExplorer />} />
          <Route path="/coordinate-surfaces" element={<CoordinateSurfaces />} />
          <Route path="/solver" element={<Solver />} />
          <Route path="/visualizer" element={<Visualizer />} />
          <Route path="/formulas" element={<FormulaLibrary />} />
          <Route path="/history" element={<History />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
