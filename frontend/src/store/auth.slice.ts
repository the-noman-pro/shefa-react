import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User, AuthTokens } from '@/types/auth.types';
import { storage } from '@/utils/storage';

const initialState: AuthState = {
    user: storage.getUser<User>(),
    tokens: storage.getAccessToken()
        ? { access: storage.getAccessToken()!, refresh: storage.getRefreshToken()! }
        : null,
    isAuthenticated: !!storage.getAccessToken(),
    isLoading: false,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action: PayloadAction<{ user: User; tokens: AuthTokens}>) => {
            state.user = action.payload.user;
            state.tokens = action.payload.tokens;
            state.isAuthenticated = true;
            state.isLoading = false;
            storage.setTokens(action.payload.tokens.access, action.payload.tokens.refresh);
            storage.setUser(action.payload.user);
        },
        logout: (state) => {
            state.user = null;
            state.tokens = null;
            state.isAuthenticated = false;
            storage.clearTokens();
        },
        updateUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            storage.setUser(action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        }
    }
})

export const { loginSuccess, logout, updateUser, setLoading } = authSlice.actions;
export default authSlice.reducer;