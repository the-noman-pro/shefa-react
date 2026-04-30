import { Link } from 'react-router-dom';
import type { Campaign } from '@/types/charity.types';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';

interface CampaignCardProps {
  campaign: Campaign;
}

const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'amber' | 'gray'> = {
  medical: 'blue', orphan: 'amber', education: 'green',
  food: 'green', water: 'blue', zakat: 'amber', general: 'gray',
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link
      to={`/campaigns/${campaign.slug}`}
      className="card p-0 overflow-hidden hover:shadow-md transition-shadow block group"
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-100">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🤲</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant={CATEGORY_COLORS[campaign.category] || 'gray'}>
            {campaign.category}
          </Badge>
          {campaign.is_featured && <Badge variant="amber">Featured</Badge>}
        </div>
        {campaign.days_remaining !== null && campaign.days_remaining <= 7 && (
          <div className="absolute top-2 right-2">
            <Badge variant="red">
              {campaign.days_remaining === 0 ? 'Last day!' : `${campaign.days_remaining}d left`}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{campaign.charity.name}</p>
        <h3 className="font-semibold text-gray-900 group-hover:text-brand line-clamp-2 mb-3">
          {campaign.title}
        </h3>

        <ProgressBar percentage={campaign.progress_percentage} size="md" />

        <div className="flex justify-between mt-3 text-sm">
          <div>
            <p className="font-semibold text-brand">{formatCurrency(campaign.raised_amount)}</p>
            <p className="text-xs text-gray-500">raised</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-700">{formatCurrency(campaign.target_amount)}</p>
            <p className="text-xs text-gray-500">goal</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-700">{formatNumber(campaign.donors_count)}</p>
            <p className="text-xs text-gray-500">donors</p>
          </div>
        </div>
      </div>
    </Link>
  );
}