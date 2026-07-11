import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { authApi } from '../api/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-slate-faint text-sm text-center">
          This reset link is missing its token. Please request a new one from{' '}
          <Link to="/forgot-password" className="text-teal-bright hover:underline">
            here
          </Link>
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      {done ? (
        <p className="text-teal-bright text-sm text-center">Password reset. Redirecting to login...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormInput
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {error && <p className="text-coral text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral text-ink font-semibold py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
