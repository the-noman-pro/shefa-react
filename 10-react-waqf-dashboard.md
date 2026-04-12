# Step 10: Waqf Products & Admin Dashboard

## Agent Instructions
Build the Waqf products listing page, purchase flow, and a basic admin analytics dashboard using PrimeReact DataTable and Recharts. This demonstrates using PrimeReact for data-heavy components — the same role PrimeVue played in the original project.

---

## What We're Building

- Waqf service
- Waqf product list with progress bars
- Waqf purchase modal (uses wallet balance)
- Admin dashboard with PrimeReact DataTable
- Analytics charts (donations over time, campaigns by category)

---

## 1. Waqf Service

```typescript
// src/services/waqf.service.ts
import api from './api';

export interface WaqfProduct {
  id: number;
  name: string;
  name_ar: string;
  description: string;
  image: string | null;
  price_per_unit: string;
  total_units: number;
  sold_units: number;
  available_units: number;
  progress_percentage: number;
  raised_amount: string;
  is_active: boolean;
}

class WaqfService {
  static async getProducts(): Promise<WaqfProduct[]> {
    const response = await api.get('/waqf/');
    return response.data.results ?? response.data;
  }

  static async buy(productId: number, units: number): Promise<{
    message: string;
    amount_paid: string;
    remaining_balance: string;
  }> {
    const response = await api.post('/waqf/buy/', {
      product_id: productId,
      units,
    });
    return response.data;
  }
}

export default WaqfService;
```

---

## 2. Waqf List Page

```typescript
// src/features/waqf/WaqfListPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import WaqfService, { WaqfProduct } from '@/services/waqf.service';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/utils/formatters';
import { useAppSelector } from '@/store';

function WaqfPurchaseModal({
  product,
  onClose,
}: {
  product: WaqfProduct;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [units, setUnits] = useState(1);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const totalCost = parseFloat(product.price_per_unit) * units;

  const mutation = useMutation({
    mutationFn: () => WaqfService.buy(product.id, units),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waqf-products'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setSuccess(data.message + ` Remaining balance: ${formatCurrency(data.remaining_balance)}`);
      setTimeout(onClose, 3000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.errors?.[0] || 'Purchase failed.');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🕌</div>
            <h2 className="text-lg font-bold text-green-700 mb-2">Purchase Successful!</h2>
            <p className="text-sm text-gray-600">{success}</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg">Purchase Waqf Units</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{product.name}</p>
            <p className="text-sm text-gray-500 mb-4">
              Price per unit: <strong>{formatCurrency(product.price_per_unit)}</strong>
              &nbsp;|&nbsp; Available: <strong>{product.available_units}</strong> units
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-3">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Units</label>
                <input
                  type="number"
                  min="1"
                  max={product.available_units}
                  value={units}
                  onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-field w-full"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-bold text-brand">{formatCurrency(totalCost)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Deducted from wallet balance</p>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || units > product.available_units}
                className="btn-primary w-full disabled:opacity-50"
              >
                {mutation.isPending ? 'Processing...' : `Buy ${units} Unit${units > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WaqfListPage() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [selectedProduct, setSelectedProduct] = useState<WaqfProduct | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['waqf-products'],
    queryFn: WaqfService.getProducts,
  });

  return (
    <>
      <Helmet><title>Waqf Products — Shefa</title></Helmet>

      <div className="py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Waqf (Endowments)</h1>
          <p className="text-gray-500 mt-1">
            Invest in lasting good deeds by contributing to waqf endowments.
            Each unit purchased funds a portion of the endowment.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-40 bg-gray-200 rounded-lg mb-3" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : !products?.length ? (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🕌</p>
            <p>No waqf products available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="card">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg mb-3 flex items-center justify-center text-5xl">
                    🕌
                  </div>
                )}

                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>

                <ProgressBar percentage={product.progress_percentage} size="md" />

                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div>
                    <p className="font-medium text-brand">{formatCurrency(product.raised_amount)}</p>
                    <p className="text-xs text-gray-400">raised</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">{formatCurrency(product.price_per_unit)}</p>
                    <p className="text-xs text-gray-400">per unit</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2 mb-3">
                  <span>{product.sold_units} / {product.total_units} units sold</span>
                  <span>{product.available_units} available</span>
                </div>

                {product.available_units > 0 ? (
                  isAuthenticated ? (
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="btn-primary w-full text-sm"
                    >
                      Purchase Units
                    </button>
                  ) : (
                    <Link to="/login" className="btn-secondary w-full text-sm block text-center">
                      Login to Purchase
                    </Link>
                  )
                ) : (
                  <button disabled className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                    Fully Funded
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <WaqfPurchaseModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
```

---

## 3. Admin Dashboard (PrimeReact DataTable)

This showcases PrimeReact — the React equivalent of PrimeVue. Install PrimeReact theme CSS:

Add to `src/App.tsx` (already done in step 06):
- `import 'primereact/resources/themes/lara-light-teal/theme.css';`
- `import 'primeicons/primeicons.css';`

### `src/features/admin/AdminDashboardPage.tsx`

```typescript
// src/features/admin/AdminDashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Campaign } from '@/types/charity.types';

// Fetch multiple resources for the dashboard
async function getDashboardData() {
  const [campaigns, charities] = await Promise.all([
    api.get('/campaigns/', { params: { page_size: 50 } }),
    api.get('/charities/'),
  ]);
  return {
    campaigns: campaigns.data.results as Campaign[],
    charities: charities.data.results,
    totalCampaigns: campaigns.data.count,
    totalCharities: charities.data.count,
  };
}

const CATEGORY_COLORS = ['#1a7a4a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function buildCategoryData(campaigns: Campaign[]) {
  const counts: Record<string, number> = {};
  campaigns.forEach((c) => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildRaisedData(campaigns: Campaign[]) {
  return campaigns
    .filter((c) => parseFloat(c.raised_amount) > 0)
    .sort((a, b) => parseFloat(b.raised_amount) - parseFloat(a.raised_amount))
    .slice(0, 8)
    .map((c) => ({
      name: c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title,
      raised: parseFloat(c.raised_amount),
      target: parseFloat(c.target_amount),
    }));
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardData,
  });

  // PrimeReact column templates
  const statusTemplate = (rowData: Campaign) => {
    const severity: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      active: 'success', paused: 'warning', completed: 'info', cancelled: 'danger',
    };
    return <Tag value={rowData.status} severity={severity[rowData.status] || 'info'} />;
  };

  const progressTemplate = (rowData: Campaign) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-brand rounded-full"
          style={{ width: `${Math.min(rowData.progress_percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">
        {rowData.progress_percentage.toFixed(0)}%
      </span>
    </div>
  );

  const raisedTemplate = (rowData: Campaign) => (
    <span className="font-medium text-brand">{formatCurrency(rowData.raised_amount)}</span>
  );

  const targetTemplate = (rowData: Campaign) => (
    <span>{formatCurrency(rowData.target_amount)}</span>
  );

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  const categoryData = data ? buildCategoryData(data.campaigns) : [];
  const raisedData = data ? buildRaisedData(data.campaigns) : [];

  return (
    <>
      <Helmet><title>Admin Dashboard — Shefa</title></Helmet>

      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Campaigns', value: data?.totalCampaigns, icon: '📢' },
            { label: 'Active Campaigns', value: data?.campaigns.filter(c => c.status === 'active').length, icon: '🟢' },
            { label: 'Total Charities', value: data?.totalCharities, icon: '🏢' },
            {
              label: 'Total Raised',
              value: formatCurrency(
                data?.campaigns.reduce((s, c) => s + parseFloat(c.raised_amount), 0) || 0
              ),
              icon: '💰',
            },
          ].map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Bar chart — top campaigns by raised amount */}
          <div className="card">
            <h2 className="font-semibold mb-4">Top Campaigns by Funds Raised</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={raisedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="raised" name="Raised" fill="#1a7a4a" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — campaigns by category */}
          <div className="card">
            <h2 className="font-semibold mb-4">Campaigns by Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PrimeReact DataTable */}
        <div className="card">
          <h2 className="font-semibold mb-4">All Campaigns</h2>
          <DataTable
            value={data?.campaigns || []}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 20]}
            tableStyle={{ minWidth: '50rem' }}
            emptyMessage="No campaigns found."
            sortMode="multiple"
            removableSort
            filterDisplay="menu"
            className="text-sm"
          >
            <Column field="title" header="Title" sortable filter style={{ minWidth: '200px' }} />
            <Column
              field="charity.name"
              header="Charity"
              sortable
              style={{ minWidth: '150px' }}
            />
            <Column field="category" header="Category" sortable filter />
            <Column header="Status" body={statusTemplate} sortField="status" sortable />
            <Column header="Raised" body={raisedTemplate} sortField="raised_amount" sortable />
            <Column header="Target" body={targetTemplate} sortField="target_amount" sortable />
            <Column header="Progress" body={progressTemplate} style={{ minWidth: '150px' }} />
            <Column
              field="end_date"
              header="End Date"
              sortable
              body={(row) => row.end_date ? formatDate(row.end_date) : '—'}
            />
          </DataTable>
        </div>
      </div>
    </>
  );
}
```

Add to router:
```typescript
// In router/index.tsx
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));

// Protected route (admin only — for now just IsAuthenticated):
{
  path: 'admin',
  element: (
    <RequireAuth>
      <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense>
    </RequireAuth>
  ),
},
```

Add to Navbar (for admin users):
```typescript
{user?.user_type === 'admin' && (
  <Link to="/admin" className="text-sm text-gray-600 hover:text-brand">Dashboard</Link>
)}
```

---

## 4. Create Test Waqf Data

```bash
cd ~/code/shefa-react/backend
uv run python manage.py shell
```

```python
from apps.waqf.models import WaqfProduct

WaqfProduct.objects.create(
    name="Water Well - Sudan",
    description="Fund construction of a clean water well serving 500 families.",
    price_per_unit=50,
    total_units=200,
    sold_units=85,
    is_active=True,
)
WaqfProduct.objects.create(
    name="Masjid Construction - Yemen",
    description="Help build a mosque for a community without a prayer space.",
    price_per_unit=100,
    total_units=500,
    sold_units=320,
    is_active=True,
)
print("Created waqf products")
exit()
```

---

## Checkpoint: Waqf & Dashboard ✓

Confirm:
- [ ] /waqf shows product cards with progress bars
- [ ] Purchase modal deducts from wallet
- [ ] /admin shows stats cards and charts
- [ ] PrimeReact DataTable with sorting and pagination works
- [ ] Pie chart shows campaign categories
- [ ] Bar chart shows top campaigns

---

## NEXT

Tell the agent: **"Waqf and Dashboard done, load 11-advanced-patterns.md"**
