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
    <div className={cn('rounded-xl bg-white p-6 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
