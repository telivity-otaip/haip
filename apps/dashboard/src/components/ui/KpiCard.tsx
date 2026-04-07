import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
}

export default function KpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-telivity-mid-grey font-medium">{title}</p>
          <p className="text-2xl font-semibold text-telivity-navy mt-1">{value}</p>
          {subtitle && <p className="text-xs text-telivity-mid-grey mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.value >= 0 ? 'text-telivity-dark-teal' : 'text-telivity-orange'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className="p-2.5 bg-telivity-teal/10 rounded-lg">
          <Icon size={20} className="text-telivity-teal" />
        </div>
      </div>
    </div>
  );
}
