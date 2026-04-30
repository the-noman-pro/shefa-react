import api from './api';
import type { User, LoginCredentials, RegisterData, AuthTokens } from '@/types/auth.types';

class AuthService {
  static async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  }

  static async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/auth/register/', data);
    return response.data;
  }

  static async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout/', { refresh: refreshToken });
  }

  static async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile/');
    return response.data;
  }

  static async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch('/auth/profile/', data);
    return response.data;
  }

  static async changePassword(data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> {
    await api.post('/auth/change-password/', data);
  }

  static async refreshToken(refresh: string): Promise<{ access: string; refresh: string }> {
    const response = await api.post('/auth/token/refresh/', { refresh });
    return response.data;
  }
}

export default AuthService;