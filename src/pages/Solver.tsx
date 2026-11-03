import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Segmented from '../components/ui/Segmented';
import { useSettings } from '../context/SettingsContext';
import VectorOperations from './VectorOperations';

export default function Solver() {
  const { mode, setMode } = useSettings();
  return (
    <>
      <PageHeader title="Step-by-Step Solver" subtitle="Every calculator can show a full worked solution: Given → Required → Formula → Substitution → Intermediate calculations → Final answer." />
      <Card className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm">Preferred display on every calculator:</span>
        <Segmented label="Default display" value={mode} onChange={setMode} options={[{ value: 'answer', label: 'Final answer only' }, { value: 'steps', label: 'Step-by-step' }]} />
      </Card>
      <p className="mb-2 text-sm text-muted">Try it here with vectors (the same solver is built into all other tools):</p>
      <VectorOperations preset={{ op: 'angle', angleMethod: 'both' }} />
    </>
  );
}
