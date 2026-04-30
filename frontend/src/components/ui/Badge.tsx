import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'amber' | 'gray' | 'red';
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const variantClass = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-800',
  }[variant];

  return (
    <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', variantClass)}>
      {children}
    </span>
  );
}