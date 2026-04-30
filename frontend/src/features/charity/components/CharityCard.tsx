import { Link } from 'react-router-dom';
import type { Charity } from '@/types/charity.types';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';

interface CharityCardProps {
  charity: Charity;
}

const CATEGORY_LABELS: Record<string, string> = {
  health: 'Health', education: 'Education', food: 'Food & Water',
  shelter: 'Shelter', orphans: 'Orphans', elderly: 'Elderly',
  disability: 'Disability', general: 'General',
};

export function CharityCard({ charity }: CharityCardProps) {
  return (
    <Link
      to={`/charities/${charity.slug}`}
      className="card hover:shadow-md transition-shadow block group"
    >
      {/* Logo */}
      <div className="flex items-start gap-3 mb-3">
        {charity.logo_url ? (
          <img
            src={charity.logo_url}
            alt={charity.name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-brand">{charity.name[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand truncate">
            {charity.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="green">{CATEGORY_LABELS[charity.category]}</Badge>
            {charity.is_featured && <Badge variant="amber">Featured</Badge>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
        <div>
          <p className="font-medium text-gray-800">{formatNumber(charity.active_campaigns_count)}</p>
          <p className="text-xs">Active Campaigns</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-brand">{formatCurrency(charity.total_raised)}</p>
          <p className="text-xs">Total Raised</p>
        </div>
      </div>
    </Link>
  );
}