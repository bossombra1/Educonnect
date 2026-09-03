import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Card({ title, children, className, action }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-line bg-white shadow-sm', className)}>
      {(title || action) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className={title || action ? 'p-4' : 'p-4'}>{children}</div>
    </section>
  );
}
