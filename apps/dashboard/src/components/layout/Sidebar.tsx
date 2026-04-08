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
  TrendingUp,
  Moon,
  BarChart3,
  Radio,
  Mail,
  MessageSquare,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Nav items with optional role restrictions.
 * If roles is undefined, any authenticated user sees the item.
 * If roles is specified, user must have at least one matching role.
 */
const NAV_ITEMS: Array<{
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: string[];
}> = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/front-desk', icon: ConciergeBell, label: 'Front Desk', roles: ['admin', 'front_desk'] },
  { to: '/reservations', icon: CalendarDays, label: 'Reservations', roles: ['admin', 'front_desk', 'readonly'] },
  { to: '/guests', icon: Users, label: 'Guests', roles: ['admin', 'front_desk', 'readonly'] },
  { to: '/rooms', icon: DoorOpen, label: 'Rooms' },
  { to: '/housekeeping', icon: Sparkles, label: 'Housekeeping', roles: ['admin', 'housekeeping', 'housekeeping_manager'] },
  { to: '/folios', icon: Receipt, label: 'Folios & Billing', roles: ['admin', 'front_desk', 'night_auditor', 'readonly'] },
  { to: '/rate-plans', icon: BadgeDollarSign, label: 'Rate Plans', roles: ['admin', 'front_desk', 'readonly'] },
  { to: '/revenue', icon: TrendingUp, label: 'Revenue Management', roles: ['admin'] },
  { to: '/night-audit', icon: Moon, label: 'Night Audit', roles: ['admin', 'night_auditor'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'night_auditor', 'readonly'] },
  { to: '/channels', icon: Radio, label: 'Channels', roles: ['admin'] },
  { to: '/communications', icon: Mail, label: 'Communications', roles: ['admin', 'front_desk'] },
  { to: '/reviews', icon: MessageSquare, label: 'Reviews', roles: ['admin', 'front_desk'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { hasRole } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || hasRole(...item.roles),
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          w-60 bg-telivity-navy text-white flex flex-col h-screen fixed left-0 top-0 z-50
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">HAIP</h1>
            <p className="text-xs text-telivity-mid-grey mt-0.5">Hotel AI Platform</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-white/10"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" role="navigation" aria-label="Main navigation">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-telivity-teal/15 text-telivity-teal border-r-3 border-telivity-teal'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10 text-xs text-telivity-mid-grey">
          v0.1.0
        </div>
      </aside>
    </>
  );
}
