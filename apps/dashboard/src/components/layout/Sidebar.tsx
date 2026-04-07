import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  Users,
  DoorOpen,
  Sparkles,
  Receipt,
  BadgeDollarSign,
  Moon,
  BarChart3,
  Radio,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/front-desk', icon: ConciergeBell, label: 'Front Desk' },
  { to: '/reservations', icon: CalendarDays, label: 'Reservations' },
  { to: '/guests', icon: Users, label: 'Guests' },
  { to: '/rooms', icon: DoorOpen, label: 'Rooms' },
  { to: '/housekeeping', icon: Sparkles, label: 'Housekeeping' },
  { to: '/folios', icon: Receipt, label: 'Folios & Billing' },
  { to: '/rate-plans', icon: BadgeDollarSign, label: 'Rate Plans' },
  { to: '/night-audit', icon: Moon, label: 'Night Audit' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-telivity-navy text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-semibold tracking-wide">HAIP</h1>
        <p className="text-xs text-telivity-mid-grey mt-0.5">Hotel AI Platform</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-telivity-teal/15 text-telivity-teal border-r-3 border-telivity-teal'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-xs text-telivity-mid-grey">
        v0.1.0
      </div>
    </aside>
  );
}
