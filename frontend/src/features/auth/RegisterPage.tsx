import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { FormField, Input } from '@/components/ui/FormField';
import { registerSchema } from './auth.schemas';
import type { RegisterFormData } from './auth.schemas';

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
            <h1 className="text-3xl font-bold text-emerald-600">Shefa</h1>
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
              <Link to="/login" className="text-emerald-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}