import clsx from 'clsx';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'blue' | 'amber';
}

export function ProgressBar({
  percentage,
  showLabel = true,
  size = 'md',
  color = 'green',
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  const heightClass = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }[size];
  const colorClass = {
    green: 'bg-brand',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  }[color];

  return (
    <div className="w-full">
      <div className={clsx('w-full bg-gray-200 rounded-full overflow-hidden', heightClass)}>
        <div
          className={clsx('rounded-full transition-all duration-500', heightClass, colorClass)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">{clamped.toFixed(0)}% funded</p>
      )}
    </div>
  );
}