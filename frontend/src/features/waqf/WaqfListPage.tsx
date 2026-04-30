import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import WaqfService from '@/services/waqf.service';
import type { WaqfProduct } from '@/services/waqf.service';
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