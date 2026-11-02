import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

/** Placeholder used until each tool is implemented in a later step. */
export default function ComingSoon({ title, description, step }: { title: string; description: string; step: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <Card>
        <p className="font-medium">This tool is planned for {step}.</p>
        <p className="mt-1 text-sm text-muted">The route, layout and navigation already work.</p>
      </Card>
    </>
  );
}
