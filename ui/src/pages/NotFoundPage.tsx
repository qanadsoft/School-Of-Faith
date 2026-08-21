import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-4 text-6xl font-serif font-bold text-primary">404</h1>
      <p className="mb-6 text-xl font-medium">Oops! Page not found</p>
      <Link to="/">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
