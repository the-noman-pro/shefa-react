import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import CharityService from '@/services/charity.service';
import CampaignService from '@/services/campaign.service';
import { CampaignCard } from '@/features/campaign/components/CampaignCard';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatters';

export default function CharityDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: charity, isLoading } = useQuery({
    queryKey: ['charity', slug],
    queryFn: () => CharityService.getCharity(slug!),
    enabled: !!slug,
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns', { charity_slug: slug }],
    queryFn: () => CampaignService.getCampaigns({ charity_slug: slug }),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="py-8 animate-pulse"><div className="h-48 bg-gray-200 rounded-xl" /></div>;
  }

  if (!charity) {
    return <div className="py-8 text-center text-red-500">Charity not found.</div>;
  }

  return (
    <>
      <Helmet><title>{charity.name} — Shefa</title></Helmet>

      <div className="py-6">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-start gap-4">
            {charity.logo_url ? (
              <img
                src={charity.logo_url}
                alt={charity.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center text-3xl font-bold text-brand">
                {charity.name[0]}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{charity.name}</h1>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="green">{charity.category}</Badge>
                {charity.city && <Badge variant="gray">{charity.city}</Badge>}
                {charity.is_featured && <Badge variant="amber">Featured</Badge>}
              </div>
              <div className="flex gap-6 mt-3 text-sm">
                <div>
                  <p className="font-bold text-brand text-lg">{formatCurrency(charity.total_raised)}</p>
                  <p className="text-xs text-gray-500">Total Raised</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700 text-lg">{charity.active_campaigns_count}</p>
                  <p className="text-xs text-gray-500">Active Campaigns</p>
                </div>
              </div>
            </div>
          </div>
          {charity.description && (
            <p className="text-gray-600 mt-4 text-sm">{charity.description}</p>
          )}
        </div>

        {/* Campaigns */}
        <h2 className="text-xl font-bold mb-4">Active Campaigns</h2>
        {campaignsData?.results.length === 0 ? (
          <p className="text-gray-500">No active campaigns at this time.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignsData?.results.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}