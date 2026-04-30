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

        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.first_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{user.full_name}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 capitalize">
                {user.user_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

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