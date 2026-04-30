export type UserType = 'donor' | 'charity_manager' | 'ambassador' | 'admin';

export interface User {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: number | null;
    user_type: UserType;
    avatar_url: string | null;
    is_verified: boolean;
    date_joined: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone?: string;
    password: string;
    password_confirm: string; 
}

export interface AuthState {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}