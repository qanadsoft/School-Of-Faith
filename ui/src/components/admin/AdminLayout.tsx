import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Clock, Award, Calendar,
  CreditCard, Heart, Ticket, Video, Download, Tag, LogOut,
  Menu, PanelLeftClose, PanelLeft, Search, MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminShell } from '@/lib/admin-tokens';
import { cn } from '@/lib/utils';

const adminNav = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { name: 'Members', path: '/admin/members', icon: Users },
  { name: 'Community', path: '/admin/community', icon: MessageCircle },
  { name: 'Courses', path: '/admin/courses', icon: BookOpen },
  { name: 'Watch Activity', path: '/admin/watch-history', icon: Clock },
  { name: 'Events', path: '/admin/events', icon: Calendar },
  { name: 'Certificates', path: '/admin/certificates', icon: Award },
  { name: 'Reading Plans', path: '/admin/reading-plans', icon: BookOpen },
  { name: 'Videos', path: '/admin/messages', icon: Video },
  { name: 'Downloads', path: '/admin/downloads', icon: Download },
  { name: 'Donations', path: '/admin/donations', icon: CreditCard },
  { name: 'Prayer Requests', path: '/admin/prayer-requests', icon: Heart },
  { name: 'Tickets', path: '/admin/tickets', icon: Ticket },
  { name: 'Tags', path: '/admin/tags', icon: Tag },
];

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {adminNav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            title={collapsed ? item.name : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? adminShell.navActive : adminShell.navInactive,
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = `${profile?.first_name?.[0] ?? 'A'}${profile?.last_name?.[0] ?? ''}`;
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Administrator';

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-60 flex-col border-r border-border bg-card">
            <div className="border-b border-border p-4">
              <h1 className="font-serif text-xl font-medium">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">School of Faith</p>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-border bg-card transition-all duration-200 md:flex',
          collapsed ? adminShell.sidebarCollapsedWidth : adminShell.sidebarWidth,
        )}
      >
        <div className={cn('flex items-center border-b border-border p-4', collapsed && 'justify-center px-2')}>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="font-serif text-xl font-medium">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">School of Faith</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarNav collapsed={collapsed} />
      </aside>

      <div
        className={cn(
          'flex min-h-[100dvh] flex-1 flex-col transition-all duration-200',
          collapsed ? 'md:pl-16' : 'md:pl-60',
        )}
      >
        {/* Top bar */}
        <header className={cn('sticky top-0 z-30 flex shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg md:px-8', adminShell.topBarHeight)}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full', adminShell.contentMaxWidth, 'p-4 md:p-8')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
