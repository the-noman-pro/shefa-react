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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="card max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Donation Successful!</h2>
            <p className="text-gray-600 text-sm">
              Thank you for donating {formatCurrency(selectedAmount)} to {campaign.title}.
            </p>
          </div>
        ) : (
          <>
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
                        onChange={() => setDonationType(type.value as 'one_time' | 'periodic')}
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