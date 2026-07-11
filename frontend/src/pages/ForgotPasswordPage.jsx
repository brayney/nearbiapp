import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in">
      {sent ? (
        <div className="text-center">
          <p className="text-teal-bright text-sm mb-6">
            If that email is registered, a reset link is on its way.
          </p>
          <Link to="/login" className="text-teal-bright hover:underline text-sm">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral text-ink font-semibold py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
