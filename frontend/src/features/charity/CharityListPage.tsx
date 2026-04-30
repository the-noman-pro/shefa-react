import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import CharityService from '@/services/charity.service';
import { CharityCard } from './components/CharityCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'food', label: 'Food & Water' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'orphans', label: 'Orphans' },
  { value: 'general', label: 'General' },
];

export default function CharityListPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['charities', { category, search: debouncedSearch }],
    queryFn: () => CharityService.getCharities({
      category: category || undefined,
      search: debouncedSearch || undefined,
    }),
  });

  return (
    <>
      <Helmet><title>Charities — Shefa</title></Helmet>

      <div className="py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Charities</h1>
          <p className="text-gray-500 mt-1">Discover organizations making a difference</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-auto"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search charities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1 min-w-[200px]"
          />
        </div>

        {/* Results Count */}
        {data && (
          <p className="text-sm text-gray-500 mb-4">
            {data.count} {data.count === 1 ? 'charity' : 'charities'} found
          </p>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded mt-3" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
            Failed to load charities. Please try again.
          </div>
        )}

        {/* Empty */}
        {!isLoading && data?.results.length === 0 && (
          <EmptyState
            title="No charities found"
            description="Try adjusting your filters or search terms."
            icon="🏢"
          />
        )}

        {/* Grid */}
        {data && data.results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.results.map((charity) => (
              <CharityCard key={charity.id} charity={charity} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}