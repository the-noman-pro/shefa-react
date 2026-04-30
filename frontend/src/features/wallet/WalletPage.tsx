import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import WalletService from '@/services/wallet.service';
import type { WalletTransaction } from '@/services/wallet.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import dayjs from 'dayjs';

function buildChartData(transactions: WalletTransaction[]) {
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