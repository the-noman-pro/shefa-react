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