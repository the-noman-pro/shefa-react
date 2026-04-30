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