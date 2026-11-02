import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

export default function About() {
  return (
    <>
      <PageHeader title="About VectorLab" />
      <Card>
        <p className="max-w-2xl text-muted">
          VectorLab is an educational platform for 3D vector analysis, coordinate systems, analytical geometry
          and differential geometry. Every result is computed by a separate math engine, never hardcoded.
        </p>
      </Card>
    </>
  );
}
