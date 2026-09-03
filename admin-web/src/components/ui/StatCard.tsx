import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: number;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

const colorMap = {
  blue: 'bg-primary-50 text-primary-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  purple: 'bg-violet-50 text-violet-700',
  red: 'bg-red-50 text-red-700',
};

export default function StatCard({ icon, label, value, change, color = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', colorMap[color])}>
          {icon}
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {change >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
          )}
          <span className={cn('font-medium', change >= 0 ? 'text-emerald-700' : 'text-red-700')}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="text-slate-400">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}
