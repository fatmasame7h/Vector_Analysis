import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import ComingSoon from './pages/ComingSoon';
import { TOOLS } from './types/tools';

// Each tool maps to the step in which it will be implemented.
const STEP: Record<string, string> = {
  'point-conversion': 'Step 4', 'point-operations': 'Step 4', 'vector-conversion': 'Step 4',
  'vector-operations': 'Step 4', 'point-explorer': 'Step 4', 'geometry-explorer': 'Step 4',
  'coordinate-surfaces': 'Step 4', solver: 'Step 4', visualizer: 'Step 3', formulas: 'Step 4',
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        {TOOLS.map((t) => (
          <Route key={t.id} path={t.path}
            element={<ComingSoon title={t.title} description={t.description} step={STEP[t.id] ?? 'a later step'} />} />
        ))}
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
