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