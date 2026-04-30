import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface UIState {
    toasts: Toast[];
    isLoading: boolean;
}

const uiSlice = createSlice({
    name: 'ui',
    initialState: { toasts: [], isLoading: false } as UIState,
    reducers: {
        addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
            state.toasts.push({
                ...action.payload,
                id: Date.now().toString(),
            })
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((t) => t.id !== action.payload);
        }
    }
})

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;