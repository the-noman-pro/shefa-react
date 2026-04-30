import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WalletService from '@/services/wallet.service';

export function useWallet() {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ['wallet'],
    queryFn: WalletService.getWallet,
  });

  const topUpMutation = useMutation({
    mutationFn: (amount: string) => WalletService.topUp(amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });

  return {
    wallet,
    balance: wallet?.balance ?? '0.00',
    transactions: wallet?.transactions ?? [],
    isLoading,
    error,
    topUp: topUpMutation.mutate,
    isTopUpLoading: topUpMutation.isPending,
    topUpError: topUpMutation.error,
  };
}