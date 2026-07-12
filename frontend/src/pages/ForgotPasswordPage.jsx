import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', birthday: '', age: '', gender: '', nationality: '', favoritePet: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ ...form, age: Number(form.age) });
      navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify your account recovery details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Confirm your account recovery details">
      <form onSubmit={handleSubmit}>
        <FormInput label="Email or username" value={form.identifier} onChange={update('identifier')} required />
        <FormInput label="Birth date" type="date" value={form.birthday} onChange={update('birthday')} required />
        <FormInput label="Current age" type="number" min="1" max="120" value={form.age} onChange={update('age')} required />
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-faint">Gender</label>
          <select value={form.gender} onChange={update('gender')} required className="w-full rounded-xl border border-ink-line bg-ink-soft px-4 py-2.5 text-[15px] outline-none focus:border-teal-bright">
            <option value="" disabled>Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <FormInput label="Nationality" value={form.nationality} onChange={update('nationality')} required />
        <FormInput label="Favorite pet" value={form.favoritePet} onChange={update('favoritePet')} autoComplete="off" required />
        {error && <p className="mb-4 text-center text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-coral py-2.5 font-semibold text-ink transition-colors hover:bg-coral-dim disabled:opacity-50">
          {loading ? 'Checking...' : 'Continue'}
        </button>
        <Link to="/login" className="mt-5 block text-center text-sm text-teal-bright hover:underline">Back to login</Link>
      </form>
    </AuthLayout>
  );
}
