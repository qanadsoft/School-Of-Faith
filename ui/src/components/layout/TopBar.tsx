import { useNavigate } from 'react-router-dom';
import { MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function TopBar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || 'M'
    : 'M';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b bg-background/80 px-4 backdrop-blur-lg md:px-8">
      <button
        onClick={() => navigate('/community')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-[#C59B46]/10 hover:text-[#C59B46] active:scale-95"
        title="Community"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <button
        onClick={() => navigate('/profile')}
        className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-primary text-sm font-serif font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95 shadow-sm ring-2 ring-primary/20"
        title={profile ? `${profile.first_name} ${profile.last_name}` : 'Profile'}
      >
        {profile?.profile_image ? (
          <img
            src={profile.profile_image}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      <button
        onClick={handleSignOut}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95 ml-1"
        title="Log Out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
  );
}
