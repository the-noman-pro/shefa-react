# Step 07: React Authentication

## Agent Instructions
Build the complete auth UI: login, register, profile pages, and the `useAuth` hook. Auth state is in Redux (built in step 06). Validate forms with React Hook Form + Zod — this is the React equivalent of Vuelidate. Show all files in full.

---

## What We're Building

- Auth service (API calls)
- `useAuth` hook (convenience wrapper around Redux)
- Login page with form validation
- Register page with form validation
- Profile page with update form
- Change password form

---

## 1. Auth Service

```typescript
// src/services/auth.service.ts
import api from './api';
import type { User, LoginCredentials, RegisterData, AuthTokens } from '@/types/auth.types';

/**
 * Auth service — class with static methods.
 * Same pattern as the Vue project's auth.service.ts.
 * Components never call api directly — they use this service.
 */
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
```

---

## 2. useAuth Hook

```typescript
// src/hooks/useAuth.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { loginSuccess, logout as logoutAction } from '@/store/auth.slice';
import AuthService from '@/services/auth.service';
import type { LoginCredentials, RegisterData } from '@/types/auth.types';
import { storage } from '@/utils/storage';

/**
 * useAuth — convenience hook for auth operations.
 * This is the React equivalent of the Vue auth store + composable pattern.
 * 
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
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
```

---

## 3. Zod Validation Schemas

```typescript
// src/features/auth/auth.schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  password_confirm: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  new_password_confirm: z.string().min(1, 'Please confirm new password'),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: 'Passwords do not match',
  path: ['new_password_confirm'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
```

---

## 4. Reusable FormField Component

```typescript
// src/components/ui/FormField.tsx
import React from 'react';
import { FieldError } from 'react-hook-form';
import clsx from 'clsx';

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'input-field',
        error && 'border-red-400 focus:ring-red-400',
        className,
      )}
      {...props}
    />
  );
}
```

---

## 5. Login Page

```typescript
// src/features/auth/LoginPage.tsx
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { FormField, Input } from '@/components/ui/FormField';
import { loginSchema, type LoginFormData } from './auth.schemas';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate('/');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors?.length) {
        setError('root', { message: apiErrors[0] });
      } else {
        setError('root', { message: 'Login failed. Please try again.' });
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Login — Shefa</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-brand">Shefa</h1>
            <h2 className="mt-2 text-xl font-semibold text-gray-800">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>

          {/* Form Card */}
          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Global error */}
              {errors.root && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {errors.root.message}
                </div>
              )}

              <FormField label="Email" error={errors.email} required>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  error={!!errors.email}
                  {...register('email')}
                />
              </FormField>

              <FormField label="Password" error={errors.password} required>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.password}
                  {...register('password')}
                />
              </FormField>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 6. Register Page

```typescript
// src/features/auth/RegisterPage.tsx
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { FormField, Input } from '@/components/ui/FormField';
import { registerSchema, type RegisterFormData } from './auth.schemas';

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      navigate('/');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors?.length) {
        setError('root', { message: apiErrors.join('. ') });
      } else {
        setError('root', { message: 'Registration failed. Please try again.' });
      }
    }
  };

  return (
    <>
      <Helmet><title>Register — Shefa</title></Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-brand">Shefa</h1>
            <h2 className="mt-2 text-xl font-semibold text-gray-800">Create your account</h2>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {errors.root && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" error={errors.first_name} required>
                  <Input
                    type="text"
                    placeholder="Ahmed"
                    error={!!errors.first_name}
                    {...register('first_name')}
                  />
                </FormField>
                <FormField label="Last Name" error={errors.last_name} required>
                  <Input
                    type="text"
                    placeholder="Ali"
                    error={!!errors.last_name}
                    {...register('last_name')}
                  />
                </FormField>
              </div>

              <FormField label="Email" error={errors.email} required>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  error={!!errors.email}
                  {...register('email')}
                />
              </FormField>

              <FormField label="Username" error={errors.username} required>
                <Input
                  type="text"
                  placeholder="ahmed_ali"
                  error={!!errors.username}
                  {...register('username')}
                />
              </FormField>

              <FormField label="Phone (optional)" error={errors.phone}>
                <Input
                  type="tel"
                  placeholder="+966 50 123 4567"
                  {...register('phone')}
                />
              </FormField>

              <FormField label="Password" error={errors.password} required>
                <Input
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  error={!!errors.password}
                  {...register('password')}
                />
              </FormField>

              <FormField label="Confirm Password" error={errors.password_confirm} required>
                <Input
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.password_confirm}
                  {...register('password_confirm')}
                />
              </FormField>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 7. Profile Page

```typescript
// src/features/auth/ProfilePage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateUser } from '@/store/auth.slice';
import AuthService from '@/services/auth.service';
import { FormField, Input } from '@/components/ui/FormField';

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const updated = await AuthService.updateProfile(data);
      dispatch(updateUser(updated));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError('root', { message: 'Failed to update profile.' });
    }
  };

  if (!user) return null;

  return (
    <>
      <Helmet><title>Profile — Shefa</title></Helmet>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>

        {/* User Info */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white text-2xl font-bold">
              {user.first_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{user.full_name}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800 capitalize">
                {user.user_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                Profile updated successfully!
              </div>
            )}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" error={errors.first_name}>
                <Input type="text" {...register('first_name')} />
              </FormField>
              <FormField label="Last Name" error={errors.last_name}>
                <Input type="text" {...register('last_name')} />
              </FormField>
            </div>

            <FormField label="Phone" error={errors.phone}>
              <Input type="tel" {...register('phone')} />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
```

---

## 8. Test Auth Flow End-to-End

Make sure the Django backend is running:
```bash
# Terminal 1 — backend
cd ~/code/shefa-react/backend
uv run python manage.py runserver 8000

# Terminal 2 — frontend  
cd ~/code/shefa-react/frontend
npm run dev
```

Test flow:
1. Go to http://localhost:5173/register
2. Fill in the form with valid data
3. Submit — should redirect to home page
4. Navbar should show your name and "Wallet" / "Logout"
5. Click Logout — should redirect to /login
6. Log back in at /login
7. Go to /profile — should show your info

Check for errors:
- Open DevTools → Network tab
- POST to /api/auth/login/ should return 200 with tokens
- Subsequent requests should have `Authorization: Bearer ...` header

---

## Checkpoint: Auth UI ✓

Confirm:
- [ ] Register form validates (try submitting empty form — shows errors)
- [ ] Register flow creates account and logs you in
- [ ] Login form works
- [ ] Logout clears token (Navbar shows Login/Register again)
- [ ] Profile page loads and saves
- [ ] Protected routes (/wallet, /profile) redirect to /login when not authenticated
- [ ] After login, redirect to /login goes to home instead

---

## NEXT

Tell the agent: **"Auth UI done, load 08-react-charity-campaign.md"**
