import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ birthday: '', favoritePet: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(form);
      navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify your account recovery details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recover your account" subtitle="Enter the birth date and favorite pet used when registering">
      <form onSubmit={handleSubmit}>
        <FormInput label="Birth date" type="date" value={form.birthday} onChange={update('birthday')} required />
        <FormInput label="Favorite pet" value={form.favoritePet} onChange={update('favoritePet')} autoComplete="off" required />
        <p className="text-xs text-slate-faint -mt-2 mb-4">Only the birth date and favorite pet are required to verify your account recovery details.</p>
        {error && <p className="mb-4 text-center text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-coral py-2.5 font-semibold text-ink transition-colors hover:bg-coral-dim disabled:opacity-50">
          {loading ? 'Checking...' : 'Continue'}
        </button>
        <Link to="/login" className="mt-5 block text-center text-sm text-teal-bright hover:underline">Back to login</Link>
      </form>
    </AuthLayout>
  );
}
