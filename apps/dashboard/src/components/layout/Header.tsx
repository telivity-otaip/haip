import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Menu, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../lib/api';

interface Property {
  id: string;
  name: string;
  code: string;
}

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { propertyId, setPropertyId } = useProperty();
  const { user, roles, authEnabled, logout } = useAuth();
  const { connected } = useSocket();
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get('/v1/properties').then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setProperties(list);
      if (!propertyId && list.length > 0) {
        setPropertyId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const activeProperty = properties.find((p) => p.id === propertyId);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-telivity-light-grey"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-telivity-slate" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-telivity-teal text-sm font-medium transition-colors"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate max-w-[140px] sm:max-w-none">{activeProperty?.name ?? 'Select Property'}</span>
            <ChevronDown size={14} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1" role="listbox">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPropertyId(p.id); setOpen(false); }}
                  role="option"
                  aria-selected={p.id === propertyId}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-telivity-light-grey transition-colors ${
                    p.id === propertyId ? 'text-telivity-teal font-semibold' : ''
                  }`}
                >
                  {p.name}
                  <span className="text-telivity-mid-grey ml-2">({p.code})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-sm text-telivity-mid-grey hidden sm:inline">
          {format(new Date(), 'EEEE, MMM d, yyyy')}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-telivity-dark-teal' : 'bg-telivity-orange'}`} aria-hidden="true" />
          <span className="text-xs text-telivity-mid-grey">{connected ? 'Live' : 'Offline'}</span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-telivity-light-grey transition-colors" aria-label="Notifications">
          <Bell size={18} className="text-telivity-slate" />
        </button>

        {authEnabled && user && (
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-telivity-slate">{user.name || user.email}</p>
              <p className="text-[10px] text-telivity-mid-grey capitalize">
                {roles.filter(r => !r.startsWith('default-')).join(', ') || 'user'}
              </p>
            </div>
            <User size={16} className="sm:hidden text-telivity-slate" />
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} className="text-telivity-mid-grey hover:text-red-600" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
