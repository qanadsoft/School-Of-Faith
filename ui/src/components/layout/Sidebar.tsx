import { NavLink } from 'react-router-dom';
import { Home, CirclePlay, BookOpen, HeartHandshake, Gift } from 'lucide-react';
import { navItems, IMAGES } from '@/data/seed';
import { cn } from '@/lib/utils';

const iconMap = {
  Home,
  CirclePlay,
  BookOpen,
  HeartHandshake,
  Gift,
};

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-20 flex-col items-center border-r bg-background py-6 md:flex lg:w-64 lg:items-start lg:px-6">
      <div className="mb-10 flex items-center justify-center lg:justify-start">
        <img src={IMAGES.LOGO} alt="School of Faith" className="hidden h-10 w-auto lg:block" />
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
          <span className="font-serif text-lg font-bold">SF</span>
        </div>
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-2 lg:items-start">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'lg:justify-start justify-center',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
