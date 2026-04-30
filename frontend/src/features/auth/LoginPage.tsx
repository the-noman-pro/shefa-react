import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { FormField, Input } from '@/components/ui/FormField';
import { loginSchema } from './auth.schemas';
import type { LoginFormData } from './auth.schemas';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600">Shefa</h1>
            <h2 className="mt-2 text-xl font-semibold text-gray-800">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
              <Link to="/register" className="text-emerald-600 hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}