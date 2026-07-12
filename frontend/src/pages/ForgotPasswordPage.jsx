import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ identifier: '', birthday: '', favoritePet: '' });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const findAccount = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.identifier.trim()) {
      setError('Enter an email or username.');
      return;
    }
    setLoading(true);

    try {
      const { data } = await authApi.lookupAccount({ identifier: form.identifier });
      if (!data.account) {
        setError('No account found for that email or username.');
        setAccount(null);
      } else {
        setAccount(data.account);
        setStep(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not find an account with that identifier.');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step === 0) {
      await findAccount(event);
      return;
    }

    setError('');
    if (!form.birthday || !form.favoritePet.trim()) {
      setError('Enter your birth date and favorite pet.');
      return;
    }

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
    <AuthLayout title="Recover your account" subtitle="Find your account and confirm recovery details">
      <form onSubmit={handleSubmit}>
        {step === 0 ? (
          <section className="rounded-3xl border border-ink-line bg-ink-soft p-6">
            <p className="mb-4 text-sm text-slate-faint">Enter the email or username for the account you want to recover.</p>
            <FormInput label="Email or username" value={form.identifier} onChange={update('identifier')} required />
          </section>
        ) : (
          <section className="rounded-3xl border border-ink-line bg-ink-soft p-6">
            <div className="mb-5 rounded-2xl border border-ink-line bg-ink p-4">
              <p className="text-sm font-semibold text-paper">Account found</p>
              <p className="mt-2 text-sm text-slate-faint">Username: <span className="font-medium text-paper">{account.username}</span></p>
              {account.displayName && <p className="mt-1 text-sm text-slate-faint">Name: <span className="font-medium text-paper">{account.displayName}</span></p>}
            </div>
            <FormInput label="Birth date" type="date" value={form.birthday} onChange={update('birthday')} required />
            <FormInput label="Favorite pet" value={form.favoritePet} onChange={update('favoritePet')} autoComplete="off" required />
            <p className="text-xs text-slate-faint -mt-2 mb-4">Confirm your account recovery details so we can send a password reset link.</p>
          </section>
        )}

        {(error || (step === 1 && account && !form.birthday && !form.favoritePet.trim())) && (
          <p className="mb-4 text-center text-sm text-coral">{error}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step === 1 && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(0);
              }}
              className="inline-flex rounded-xl border border-ink-line bg-ink-soft px-5 py-2.5 text-sm font-semibold text-paper transition duration-200 hover:bg-ink/80 sm:max-w-[160px]"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full justify-center rounded-xl bg-coral py-2.5 px-6 text-sm font-semibold text-ink transition duration-200 hover:bg-coral-dim disabled:opacity-50 sm:w-auto sm:max-w-[220px]"
          >
            {loading ? (step === 0 ? 'Checking...' : 'Verifying...') : step === 0 ? 'Find account' : 'Continue'}
          </button>
        </div>

        <Link to="/login" className="mt-5 block text-center text-sm text-teal-bright hover:underline">Back to login</Link>
      </form>
    </AuthLayout>
  );
}
