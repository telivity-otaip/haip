import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-telivity-light-grey">
      <Sidebar />
      <div className="ml-60">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
