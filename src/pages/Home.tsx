import ToolCard from '../components/ui/ToolCard';
import { TOOLS } from '../types/tools';

export default function Home() {
  const main = TOOLS.filter((t) => t.group === 'main');
  const extra = TOOLS.filter((t) => t.group === 'additional');
  return (
    <>
      <section className="py-8 text-center sm:py-14">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Vector Analysis</h1>
        <p className="mt-3 text-lg font-medium text-accent">Calculate • Visualize • Learn</p>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          An interactive platform for understanding 3D vectors, coordinate systems, and mathematical geometry.
        </p>
      </section>

      <section aria-labelledby="main-tools">
        <h2 id="main-tools" className="mb-4 text-xl font-semibold">Main tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {main.map((t) => <ToolCard key={t.id} tool={t} />)}
        </div>
      </section>

      <section aria-labelledby="extra-tools" className="mt-10">
        <h2 id="extra-tools" className="mb-4 text-xl font-semibold">More ways to learn</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {extra.map((t) => <ToolCard key={t.id} tool={t} compact />)}
        </div>
      </section>
    </>
  );
}
