import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { registerUser, clearAuthError } from '../features/auth/authSlice';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/verify-email-pending', { replace: true, state: { email: form.email } });
    }
  };

  return (
    <AuthLayout title="Join nearbi" subtitle="Connect with the people actually around you">
      <form onSubmit={handleSubmit}>
        <FormInput label="Display name" value={form.displayName} onChange={update('displayName')} />
        <FormInput
          label="Username"
          value={form.username}
          onChange={update('username')}
          autoComplete="username"
          required
        />
        <FormInput
          label="Email"
          type="email"
          value={form.email}
          onChange={update('email')}
          autoComplete="email"
          required
        />
        <FormInput
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-slate-mute -mt-2 mb-4">At least 8 characters, including a number.</p>
        <p className="text-xs text-slate-faint -mt-2 mb-4">Use an email inbox you control. We’ll send a verification link before password recovery is enabled.</p>

        {error && <p className="text-coral text-sm mb-4 text-center">{error}</p>}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-coral text-ink font-semibold py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-faint mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-teal-bright hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
