import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import CampaignService from '@/services/campaign.service';
import { CampaignCard } from './components/CampaignCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'medical', label: 'Medical' },
  { value: 'orphan', label: 'Orphans' },
  { value: 'education', label: 'Education' },
  { value: 'food', label: 'Food' },
  { value: 'water', label: 'Water' },
  { value: 'zakat', label: 'Zakat' },
  { value: 'general', label: 'General' },
];

export default function CampaignListPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns', { category, search: debouncedSearch, page }],
    queryFn: () => CampaignService.getCampaigns({
      category: category || undefined,
      search: debouncedSearch || undefined,
      page,
    }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Helmet><title>Campaigns — Shefa</title></Helmet>

      <div className="py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Support a cause that matters to you</p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat.value
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field max-w-md"
          />
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-2 bg-gray-100 rounded w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
            Failed to load campaigns.
          </div>
        )}

        {!isLoading && data?.results.length === 0 && (
          <EmptyState title="No campaigns found" icon="🌱" />
        )}

        {data && data.results.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">{data.count} campaigns</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.results.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!data.previous}
                  className="btn-secondary text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {data.current_page} of {data.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.next}
                  className="btn-secondary text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}