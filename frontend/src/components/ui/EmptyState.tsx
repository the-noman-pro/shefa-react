interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-16 text-gray-500">
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      {description && <p className="mt-1 text-sm">{description}</p>}
    </div>
  );
}