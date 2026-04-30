export type CharityCategory =
  | 'health' | 'education' | 'food' | 'shelter'
  | 'orphans' | 'elderly' | 'disability' | 'general';

export interface Charity {
    id: number;
    name: string;
    name_ar: string;
    slug: string;
    description?: string;
    description_ar?: string;
    category: CharityCategory;
    city: string;
    logo_url: string | null;
    cover_image?: string | null;
    is_featured: boolean;
    active_campaigns_count: number;
    total_raised: string;
    email?: string;
    phone?: string;
    website?: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
    id: number;
    charity: Charity;
    title: string;
    title_ar: string;
    slug: string;
    description?: string;
    category: string;
    status: CampaignStatus;
    image_url: string | null;
    target_amount: string;
    raised_amount: string;
    donors_count: number;
    progress_percentage: number;
    remaining_amount: string;
    days_remaining: number | null;
    start_date: string;
    end_date: string | null;
    is_featured: boolean;
    minimum_donation?: string;
}