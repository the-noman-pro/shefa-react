import api from './api';
import type { Campaign } from '@/types/charity.types';
import type { PaginatedResponse } from '@/types/api.types';

interface CampaignFilters {
  category?: string;
  charity?: number;
  charity_slug?: string;
  is_featured?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

class CampaignService {
  static async getCampaigns(filters?: CampaignFilters): Promise<PaginatedResponse<Campaign>> {
    const response = await api.get('/campaigns/', { params: filters });
    return response.data;
  }

  static async getCampaign(slug: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${slug}/`);
    return response.data;
  }
}

export default CampaignService;