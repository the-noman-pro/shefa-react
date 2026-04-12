# Step 08: React Charity & Campaign Features

## Agent Instructions
Build the charity listing, detail pages, and campaign listing with filtering. Use TanStack Query for data fetching. Use PrimeReact DataTable for the admin-style tables. Show full component code.

---

## What We're Building

- Charity service + custom hook
- Charity list page with grid layout + filtering
- Charity detail page
- Campaign list page with filter sidebar
- Campaign detail page with progress bar, donors list
- Reusable `ProgressBar`, `CampaignCard`, `CharityCard` components

---

## 1. Services

### `src/services/charity.service.ts`

```typescript
import api from './api';
import type { Charity } from '@/types/charity.types';
import type { PaginatedResponse } from '@/types/api.types';

interface CharityFilters {
  category?: string;
  city?: string;
  is_featured?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

class CharityService {
  static async getCharities(filters?: CharityFilters): Promise<PaginatedResponse<Charity>> {
    const response = await api.get('/charities/', { params: filters });
    return response.data;
  }

  static async getCharity(slug: string): Promise<Charity> {
    const response = await api.get(`/charities/${slug}/`);
    return response.data;
  }
}

export default CharityService;
```

### `src/services/campaign.service.ts`

```typescript
import api from './api';
import type { Campaign } from '@/types/charity.types';
import type { PaginatedResponse } from '@/types/api.types';

interface CampaignFilters {
  category?: string;
  charity?: number;
  charity_slug?: string;
  is_featured?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

class CampaignService {
  static async getCampaigns(filters?: CampaignFilters): Promise<PaginatedResponse<Campaign>> {
    const response = await api.get('/campaigns/', { params: filters });
    return response.data;
  }

  static async getCampaign(slug: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${slug}/`);
    return response.data;
  }
}

export default CampaignService;
```

---

## 2. Reusable UI Components

### `src/components/ui/ProgressBar.tsx`

```typescript
// src/components/ui/ProgressBar.tsx
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
```

### `src/components/ui/Badge.tsx`

```typescript
// src/components/ui/Badge.tsx
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
```

### `src/components/ui/EmptyState.tsx`

```typescript
// src/components/ui/EmptyState.tsx
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
```

---

## 3. Charity Components

### `src/features/charity/components/CharityCard.tsx`

```typescript
// src/features/charity/components/CharityCard.tsx
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
```

---

## 4. Charity List Page

```typescript
// src/features/charity/CharityListPage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import CharityService from '@/services/charity.service';
import { CharityCard } from './components/CharityCard';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => setDebouncedSearch(value), 400);
  };

  /**
   * TanStack Query — replaces Vue's onMounted + ref pattern.
   * queryKey changes trigger automatic refetch.
   */
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
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-auto"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search charities..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field flex-1 min-w-[200px]"
          />
        </div>

        {/* Results Count */}
        {data && (
          <p className="text-sm text-gray-500 mb-4">
            {data.count} {data.count === 1 ? 'charity' : 'charities'} found
          </p>
        )}

        {/* Loading */}
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
```

---

## 5. Campaign Card Component

```typescript
// src/features/campaign/components/CampaignCard.tsx
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
```

---

## 6. Campaign List Page

```typescript
// src/features/campaign/CampaignListPage.tsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import CampaignService from '@/services/campaign.service';
import { CampaignCard } from './components/CampaignCard';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearTimeout((window as any)._campaignSearchTimeout);
    (window as any)._campaignSearchTimeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns', { category, search: debouncedSearch, page }],
    queryFn: () => CampaignService.getCampaigns({
      category: category || undefined,
      search: debouncedSearch || undefined,
      page,
    }),
    placeholderData: (prev) => prev, // keep previous data while loading next page
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
            onChange={(e) => handleSearch(e.target.value)}
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
```

---

## 7. Campaign Detail Page

```typescript
// src/features/campaign/CampaignDetailPage.tsx
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
            {/* Image */}
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

            {/* Tags */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge variant="green">{campaign.category}</Badge>
              {campaign.is_featured && <Badge variant="amber">Featured</Badge>}
              <Badge variant={campaign.status === 'active' ? 'green' : 'gray'}>
                {campaign.status}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{campaign.title}</h1>

            {/* Charity */}
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

            {/* Description */}
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

      {/* Donate Modal — built in step 09 */}
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
```

---

## 8. Charity Detail Page

```typescript
// src/features/charity/CharityDetailPage.tsx
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
```

---

## 9. Verify Everything Works

With both backend and frontend running:

1. Go to http://localhost:5173/charities — charity grid with skeletons then cards
2. Click a charity — detail page with its campaigns
3. Go to http://localhost:5173/campaigns — campaign grid with category filter tabs
4. Click a campaign — detail page with progress bar and donate button
5. Search in campaigns — results update with 400ms debounce

---

## Checkpoint: Charity & Campaign UI ✓

Confirm:
- [ ] Charity list shows cards from the API
- [ ] Category filter works (watch Network tab)
- [ ] Campaign cards show progress bars
- [ ] Campaign detail shows correct progress percentage
- [ ] Charity detail shows the charity's campaigns
- [ ] Loading skeletons appear before data loads

---

## NEXT

Tell the agent: **"Charity and Campaign UI done, load 09-react-donation-wallet.md"**
