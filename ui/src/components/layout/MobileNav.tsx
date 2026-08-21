import { NavLink } from 'react-router-dom';
import { Home, CirclePlay, BookOpen, HeartHandshake, Gift } from 'lucide-react';
import { navItems } from '@/data/seed';
import { cn } from '@/lib/utils';

const iconMap = {
  Home,
  CirclePlay,
  BookOpen,
  HeartHandshake,
  Gift,
};

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 w-full items-center justify-around border-t bg-background/80 px-2 pb-4 pt-2 backdrop-blur-lg md:hidden">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        );
      })}
    </nav>
  );
}
