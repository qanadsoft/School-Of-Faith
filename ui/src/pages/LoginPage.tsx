import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error, user } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      const isAdmin = user?.role === 'admin' || (user as any)?.roles?.includes('admin');
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  };

  const fillDemo = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-serif font-medium">The School of Faith</h1>
          <p className="mt-1 text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <p className="mb-2 font-semibold text-foreground">Demo Accounts</p>
          <div className="space-y-2">
            <button
              onClick={() => fillDemo('sarah@example.com', 'Faithful123!')}
              className="block w-full text-left text-muted-foreground hover:text-primary"
            >
              Member: sarah@example.com / Faithful123!
            </button>
            <button
              onClick={() => fillDemo('admin@example.com', 'AdminFaith123!')}
              className="block w-full text-left text-muted-foreground hover:text-primary"
            >
              Admin: admin@example.com / AdminFaith123!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
