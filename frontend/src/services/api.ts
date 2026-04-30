import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { storage } from '@/utils/storage';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - attach JWT access token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = storage.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Response interceptor - handle 401 token refresh
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = storage.getRefreshToken();
            if (!refreshToken) {
                storage.clearTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    refreshQueue.push((token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    })
                })
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
                    refresh: refreshToken,
                })
                const { access, refresh } = response.data;
                storage.setTokens(access, refresh);

                refreshQueue.forEach((cb) => cb(access));
                refreshQueue = [];

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                storage.clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
)

export default api;