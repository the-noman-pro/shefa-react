# Step 09: Donation Flow & Wallet UI

## Agent Instructions
Build the donation modal, wallet page with balance display and transaction history, and a chart showing spending over time using Recharts. These are the most interactive parts of the app.

---

## What We're Building

- Donation modal (select amount, submit, show confirmation)
- Wallet page (balance card, top-up, transaction list)
- Transaction history chart with Recharts
- Wire up the "Donate Now" button from campaign detail

---

## 1. Donation & Wallet Services

### `src/services/donation.service.ts`

```typescript
import api from './api';

interface CreateDonationData {
  campaign: number;
  amount: string;
  donation_type?: 'one_time' | 'periodic';
  is_anonymous?: boolean;
  note?: string;
}

export interface Donation {
  id: number;
  campaign: { id: number; title: string; slug: string };
  amount: string;
  donation_type: string;
  is_anonymous: boolean;
  is_confirmed: boolean;
  created_at: string;
}

class DonationService {
  static async donate(data: CreateDonationData): Promise<Donation> {
    const response = await api.post('/payments/donate/', data);
    return response.data;
  }

  static async getMyDonations(): Promise<Donation[]> {
    const response = await api.get('/payments/my-donations/');
    return response.data.results ?? response.data;
  }
}

export default DonationService;
```

### `src/services/wallet.service.ts`

```typescript
import api from './api';

export interface WalletTransaction {
  id: number;
  amount: string;
  transaction_type: 'credit' | 'debit';
  source: string;
  description: string;
  balance_after: string;
  created_at: string;
}

export interface Wallet {
  id: number;
  balance: string;
  transactions: WalletTransaction[];
  updated_at: string;
}

class WalletService {
  static async getWallet(): Promise<Wallet> {
    const response = await api.get('/wallet/');
    return response.data;
  }

  static async topUp(amount: string): Promise<{ balance: string; message: string }> {
    const response = await api.post('/wallet/top-up/', { amount });
    return response.data;
  }

  static async getTransactions(): Promise<WalletTransaction[]> {
    const response = await api.get('/wallet/transactions/');
    return response.data.results ?? response.data;
  }
}

export default WalletService;
```

---

## 2. Donation Modal Component

```typescript
// src/features/donation/DonateModal.tsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DonationService from '@/services/donation.service';
import type { Campaign } from '@/types/charity.types';
import { formatCurrency } from '@/utils/formatters';

interface DonateModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = ['50', '100', '200', '500', '1000'];

export function DonateModal({ campaign, onClose, onSuccess }: DonateModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donationType, setDonationType] = useState<'one_time' | 'periodic'>('one_time');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedAmount = customAmount || amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmount || parseFloat(selectedAmount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const minDonation = parseFloat(campaign.minimum_donation || '10');
    if (parseFloat(selectedAmount) < minDonation) {
      setError(`Minimum donation is ${formatCurrency(minDonation)}.`);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await DonationService.donate({
        campaign: campaign.id,
        amount: selectedAmount,
        donation_type: donationType,
        is_anonymous: isAnonymous,
        note,
      });
      // Invalidate wallet and campaign queries so they refetch
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.slug] });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      setError(apiErrors?.[0] || 'Donation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Modal backdrop
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="card max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          // Success state
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Donation Successful!</h2>
            <p className="text-gray-600 text-sm">
              Thank you for donating {formatCurrency(selectedAmount)} to {campaign.title}.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Donate to Campaign</h2>
                <p className="text-sm text-gray-500 mt-0.5">{campaign.title}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Preset Amounts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Amount (SAR)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setAmount(preset); setCustomAmount(''); }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        amount === preset && !customAmount
                          ? 'bg-brand text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Or enter custom amount"
                  value={customAmount}
                  min={campaign.minimum_donation || '10'}
                  step="0.01"
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount(''); }}
                  className="input-field w-full"
                />
              </div>

              {/* Donation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Donation Type</label>
                <div className="flex gap-3">
                  {[
                    { value: 'one_time', label: 'One-time' },
                    { value: 'periodic', label: 'Monthly' },
                  ].map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="donation_type"
                        value={type.value}
                        checked={donationType === type.value}
                        onChange={() => setDonationType(type.value as any)}
                        className="text-brand"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-brand"
                  />
                  <span className="text-sm text-gray-700">Donate anonymously</span>
                </label>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Leave a message..."
                  className="input-field w-full resize-none"
                />
              </div>

              {/* Summary */}
              {selectedAmount && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Donation amount</span>
                    <span className="font-semibold">{formatCurrency(selectedAmount)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Payment method</span>
                    <span className="font-medium text-brand">Wallet Balance</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedAmount || isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : `Donate ${selectedAmount ? formatCurrency(selectedAmount) : ''}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 3. Wire Donate Modal into Campaign Detail

Update `src/features/campaign/CampaignDetailPage.tsx` — replace the placeholder modal section:

```typescript
// Add import at top:
import { DonateModal } from '@/features/donation/DonateModal';

// Replace the placeholder modal at the bottom:
{showDonateModal && campaign && (
  <DonateModal
    campaign={campaign}
    onClose={() => setShowDonateModal(false)}
    onSuccess={() => setShowDonateModal(false)}
  />
)}
```

---

## 4. Wallet Page

```typescript
// src/features/wallet/WalletPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import WalletService, { WalletTransaction } from '@/services/wallet.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import dayjs from 'dayjs';

// Prepare chart data from transactions
function buildChartData(transactions: WalletTransaction[]) {
  // Group by day, show balance over time
  const map: Record<string, number> = {};
  [...transactions].reverse().forEach((t) => {
    const day = dayjs(t.created_at).format('MMM D');
    map[day] = parseFloat(t.balance_after);
  });
  return Object.entries(map).map(([date, balance]) => ({ date, balance }));
}

const PRESET_TOP_UP = ['100', '200', '500', '1000'];

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState('');
  const [topUpError, setTopUpError] = useState('');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: WalletService.getWallet,
  });

  const topUpMutation = useMutation({
    mutationFn: (amount: string) => WalletService.topUp(amount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setTopUpSuccess(`Wallet topped up! New balance: ${formatCurrency(data.balance)}`);
      setTopUpAmount('');
      setTimeout(() => setTopUpSuccess(''), 4000);
    },
    onError: (err: any) => {
      setTopUpError(err?.response?.data?.errors?.[0] || 'Top-up failed.');
      setTimeout(() => setTopUpError(''), 4000);
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpAmount || parseFloat(topUpAmount) < 10) {
      setTopUpError('Minimum top-up is 10 SAR.');
      return;
    }
    topUpMutation.mutate(topUpAmount);
  };

  const chartData = wallet?.transactions ? buildChartData(wallet.transactions) : [];

  return (
    <>
      <Helmet><title>My Wallet — Shefa</title></Helmet>

      <div className="py-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Wallet</h1>

        {isLoading ? (
          <div className="card animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-brand to-brand-dark text-white rounded-xl p-6 mb-4">
              <p className="text-sm opacity-80 mb-1">Available Balance</p>
              <p className="text-4xl font-bold">
                {formatCurrency(wallet?.balance || '0')}
              </p>
              <p className="text-sm opacity-70 mt-2">
                Last updated: {wallet ? formatDate(wallet.updated_at) : '—'}
              </p>
            </div>

            {/* Top Up Form */}
            <div className="card mb-4">
              <h2 className="font-semibold mb-3">Top Up Wallet</h2>

              {topUpSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 mb-3">
                  {topUpSuccess}
                </div>
              )}
              {topUpError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-3">
                  {topUpError}
                </div>
              )}

              <form onSubmit={handleTopUp} className="space-y-3">
                {/* Preset amounts */}
                <div className="flex gap-2 flex-wrap">
                  {PRESET_TOP_UP.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        topUpAmount === preset
                          ? 'bg-brand text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Enter amount (SAR)"
                    value={topUpAmount}
                    min="10"
                    step="0.01"
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="input-field flex-1"
                  />
                  <button
                    type="submit"
                    disabled={topUpMutation.isPending}
                    className="btn-primary disabled:opacity-50 whitespace-nowrap"
                  >
                    {topUpMutation.isPending ? 'Processing...' : 'Top Up'}
                  </button>
                </div>
              </form>
            </div>

            {/* Balance Chart */}
            {chartData.length > 1 && (
              <div className="card mb-4">
                <h2 className="font-semibold mb-4">Balance History</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a7a4a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1a7a4a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Balance']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#1a7a4a"
                      strokeWidth={2}
                      fill="url(#balanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Transaction History */}
            <div className="card">
              <h2 className="font-semibold mb-4">Transaction History</h2>
              {!wallet?.transactions.length ? (
                <p className="text-gray-400 text-sm text-center py-8">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {wallet.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                            tx.transaction_type === 'credit'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {tx.transaction_type === 'credit' ? '↑' : '↓'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {tx.source.replace('_', ' ')}
                          </p>
                          {tx.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {tx.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">{formatDate(tx.created_at, 'MMM D, YYYY h:mm A')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${
                          tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Balance: {formatCurrency(tx.balance_after)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
```

---

## 5. My Donations Page

Create a simple donations history page linked from the profile:

```typescript
// src/features/donation/MyDonationsPage.tsx
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
```

Add to router in `src/router/index.tsx`:
```typescript
const MyDonationsPage = lazy(() => import('@/features/donation/MyDonationsPage'));

// Inside the children array under RequireAuth:
{
  path: 'donations',
  element: (
    <RequireAuth>
      <Suspense fallback={<PageLoader />}><MyDonationsPage /></Suspense>
    </RequireAuth>
  ),
},
```

Add link in Navbar:
```typescript
// In the authenticated links section of Navbar.tsx:
<Link to="/donations" className="text-sm text-gray-600 hover:text-brand">
  Donations
</Link>
```

---

## 6. End-to-End Donation Test

With both servers running:

1. Login to your account
2. Go to /wallet — balance should be 0 SAR
3. Top up 500 SAR
4. Go to a campaign detail page (e.g., /campaigns/medical-aid-children)
5. Click "Donate Now"
6. Select 100 SAR, click Donate
7. Should see success message
8. Go back to /wallet — balance should be 400 SAR
9. Check transaction history — should show 1 credit (top-up) and 1 debit (donation)
10. Balance chart should appear after 2 transactions

---

## Checkpoint: Donation & Wallet ✓

Confirm:
- [ ] Wallet page shows balance and transactions
- [ ] Top-up adds to balance
- [ ] Donate modal opens from campaign detail
- [ ] Donation deducts from wallet
- [ ] Chart appears with transaction history
- [ ] Campaign raised_amount updates after donation (refresh campaign page)
- [ ] My donations page shows donation history

---

## NEXT

Tell the agent: **"Donation and Wallet done, load 10-react-waqf-dashboard.md"**
