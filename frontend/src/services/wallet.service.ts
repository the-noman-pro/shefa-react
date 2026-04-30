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