import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { loginSuccess, logout as logoutAction } from '@/store/auth.slice';
import AuthService from '@/services/auth.service';
import type { LoginCredentials, RegisterData } from '@/types/auth.types';
import { storage } from '@/utils/storage';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = await AuthService.login(credentials);
    dispatch(loginSuccess({ user: data.user, tokens: data.tokens }));
    return data.user;
  }, [dispatch]);

  const register = useCallback(async (data: RegisterData) => {
    const result = await AuthService.register(data);
    dispatch(loginSuccess({ user: result.user, tokens: result.tokens }));
    return result.user;
  }, [dispatch]);

  const logout = useCallback(async () => {
    const refreshToken = storage.getRefreshToken();
    if (refreshToken) {
      try {
        await AuthService.logout(refreshToken);
      } catch {
        // Ignore — clear local state regardless
      }
    }
    dispatch(logoutAction());
    navigate('/login');
  }, [dispatch, navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}