const STORAGE_KEYS = {
    ACCESS_TOKEN: 'shefa_access_token',
    REFRESH_TOKEN: 'shefa_refresh_token',
    USER: 'shefa_user',
} as const;

export const storage = {
    getAccessToken: (): string | null => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    getRefreshToken: (): string | null => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),

    setTokens: (access: string, refresh: string): void => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh)
    },

    clearTokens: (): void => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    getUser: <T>(): T | null => {
        const raw = localStorage.getItem(STORAGE_KEYS.USER);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    setUser: (user: unknown): void => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
}