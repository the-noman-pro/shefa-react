import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DonationService from '@/services/donation.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';

export default function MyDonationsPage() {
  const { data: donations, isLoading } = useQuery({
    queryKey: ['my-donations'],
    queryFn: DonationService.getMyDonations,
  });

  return (
    <>
      <Helmet><title>My Donations — Shefa</title></Helmet>
      <div className="py-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Donations</h1>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-16" />
            ))}
          </div>
        ) : !donations?.length ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">You haven't made any donations yet.</p>
            <Link to="/campaigns" className="btn-primary">Browse Campaigns</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      to={`/campaigns/${donation.campaign.slug}`}
                      className="font-medium text-gray-900 hover:text-brand"
                    >
                      {donation.campaign.title}
                    </Link>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="gray">{donation.donation_type.replace('_', ' ')}</Badge>
                      {donation.is_anonymous && <Badge variant="gray">Anonymous</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(donation.created_at)}</p>
                  </div>
                  <p className="font-bold text-brand text-lg">{formatCurrency(donation.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}