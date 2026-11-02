import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="This address does not match any VectorLab tool." />
      <Link to="/" className="font-medium text-accent">Back to Home</Link>
    </>
  );
}
