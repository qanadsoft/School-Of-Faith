import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background md:flex-row">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto pb-20 md:pb-0 md:pl-20 lg:pl-64">
        <TopBar />
        <div className="flex-1">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
