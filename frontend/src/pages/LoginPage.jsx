import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { loginUser, clearAuthError } from '../features/auth/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((s) => s.auth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const result = await dispatch(loginUser({ identifier, password, rememberMe }));
    if (loginUser.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see what's happening close by">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          required
        />
        <FormInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between mb-6 text-sm">
          <label className="flex items-center gap-2 text-slate-faint">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-coral"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-teal-bright hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-coral text-sm mb-4 text-center">{error}</p>}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-coral text-ink font-semibold py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-faint mt-6">
        New here?{' '}
        <Link to="/register" className="text-teal-bright hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
