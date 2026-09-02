import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  className?: string;
}

const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export default function LoadingSpinner({ size = 'md', fullPage, className }: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('animate-spin rounded-full border-4 border-primary/30 border-t-primary', sizeMap[size], className)} />
  );

  if (fullPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F0F4FF]">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  );
}
