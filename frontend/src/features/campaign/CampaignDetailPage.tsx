import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import CampaignService from '@/services/campaign.service';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import { useAppSelector } from '@/store';

export default function CampaignDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [showDonateModal, setShowDonateModal] = useState(false);

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => CampaignService.getCampaign(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="py-8 animate-pulse space-y-4">
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500">Campaign not found.</p>
        <Link to="/campaigns" className="btn-primary mt-4 inline-block">Back to Campaigns</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{campaign.title} — Shefa</title>
      </Helmet>

      <div className="py-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link to="/campaigns" className="hover:text-brand">Campaigns</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{campaign.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-72 object-cover rounded-xl mb-4"
              />
            ) : (
              <div className="w-full h-72 bg-gray-100 rounded-xl flex items-center justify-center text-7xl mb-4">
                🤲
              </div>
            )}

            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge variant="green">{campaign.category}</Badge>
              {campaign.is_featured && <Badge variant="amber">Featured</Badge>}
              <Badge variant={campaign.status === 'active' ? 'green' : 'gray'}>
                {campaign.status}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{campaign.title}</h1>

            <Link
              to={`/charities/${campaign.charity.slug}`}
              className="flex items-center gap-2 mb-4 text-sm text-gray-500 hover:text-brand"
            >
              {campaign.charity.logo_url && (
                <img
                  src={campaign.charity.logo_url}
                  alt={campaign.charity.name}
                  className="w-6 h-6 rounded object-cover"
                />
              )}
              <span>{campaign.charity.name}</span>
            </Link>

            <div className="prose prose-sm text-gray-700 max-w-none">
              <p>{campaign.description}</p>
            </div>
          </div>

          {/* Sidebar — Donation Widget */}
          <div className="space-y-4">
            <div className="card sticky top-20">
              <ProgressBar percentage={campaign.progress_percentage} size="lg" />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xl font-bold text-brand">
                    {formatCurrency(campaign.raised_amount)}
                  </p>
                  <p className="text-xs text-gray-500">raised</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-700">
                    {formatCurrency(campaign.target_amount)}
                  </p>
                  <p className="text-xs text-gray-500">goal</p>
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                <span>{formatNumber(campaign.donors_count)} donors</span>
                {campaign.days_remaining !== null && (
                  <span className="font-medium text-orange-600">
                    {campaign.days_remaining} days left
                  </span>
                )}
              </div>

              {campaign.end_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Campaign ends: {formatDate(campaign.end_date)}
                </p>
              )}

              {campaign.status === 'active' && (
                isAuthenticated ? (
                  <button
                    onClick={() => setShowDonateModal(true)}
                    className="btn-primary w-full mt-4"
                  >
                    Donate Now
                  </button>
                ) : (
                  <Link to="/login" className="btn-primary w-full mt-4 block text-center">
                    Login to Donate
                  </Link>
                )
              )}

              {campaign.minimum_donation && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  Minimum donation: {formatCurrency(campaign.minimum_donation)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Donate Modal — placeholder until step 09 */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Donate to {campaign.title}</h2>
            <p className="text-gray-500 text-sm mb-4">
              Donation feature will be fully implemented in step 09.
            </p>
            <button onClick={() => setShowDonateModal(false)} className="btn-secondary w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}