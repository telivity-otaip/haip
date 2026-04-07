import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-telivity-light-grey">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-60">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
