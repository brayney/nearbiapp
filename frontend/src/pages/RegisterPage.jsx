import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import FormInput from '../components/FormInput';
import { registerUser, clearAuthError } from '../features/auth/authSlice';

const STEP_TITLES = ['Account details', 'Security', 'Personal information', 'Recovery information'];

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: '', username: '', email: '', password: '', confirmPassword: '', birthday: '', gender: '', nationality: '', favoritePet: '',
  });
  const [stepError, setStepError] = useState('');
  const age = form.birthday ? calculateAge(form.birthday) : '';

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const isStepValid = () => {
    if (step === 0) {
      return form.username.trim() && form.email.trim();
    }
    if (step === 1) {
      return form.password.length >= 8 && /\d/.test(form.password) && form.password === form.confirmPassword;
    }
    if (step === 2) {
      return form.birthday && form.gender && form.nationality.trim();
    }
    return form.favoritePet.trim();
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (!isStepValid()) {
      setStepError('Please complete all required fields for this step.');
      return;
    }
    setStepError('');
    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  };

  const prevStep = () => {
    setStepError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEP_TITLES.length - 1) {
      nextStep(e);
      return;
    }

    if (!isStepValid()) {
      setStepError('Please complete all required fields for this step.');
      return;
    }

    dispatch(clearAuthError());
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/feed', { replace: true });
    }
  };

  return (
    <AuthLayout title="Join nearbi" subtitle="Connect with the people actually around you">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 rounded-3xl border border-ink-line bg-ink-soft p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-faint">Step {step + 1} of {STEP_TITLES.length}</p>
          <h2 className="mt-3 text-xl font-semibold text-paper">{STEP_TITLES[step]}</h2>
        </div>

        <div className="rounded-3xl border border-ink-line bg-ink-soft p-6 space-y-6">
          {step === 0 && (
            <div className="space-y-4">
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
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <FormInput
                label="Password"
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                required
              />
              <FormInput
                label="Re-enter password"
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-slate-mute -mt-2 mb-4">At least 8 characters, including a number. Both values must match.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <FormInput label="Birth date" type="date" value={form.birthday} onChange={update('birthday')} required />
              <FormInput label="Age" value={age} readOnly placeholder="Calculated from your birth date" />
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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <FormInput label="Favorite pet" value={form.favoritePet} onChange={update('favoritePet')} autoComplete="off" required />
              <p className="text-xs text-slate-faint -mt-2 mb-4">This detail is used for account recovery.</p>
            </div>
          )}

          {(stepError || error) && (
            <p className="text-coral text-sm text-center">{stepError || error}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex rounded-xl border border-ink-line bg-ink-soft px-5 py-2.5 text-sm font-semibold text-paper transition duration-200 hover:bg-ink/80 sm:max-w-[160px]"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-bright transition duration-200 hover:text-teal-bright/80 disabled:opacity-50"
            >
              {step < STEP_TITLES.length - 1
                ? 'Proceed →'
                : status === 'loading'
                ? 'Creating account...'
                : 'Create account'}
            </button>
          </div>
        </div>
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

function calculateAge(value) {
  const birthday = new Date(`${value}T00:00:00`);
  const today = new Date();
  let result = today.getFullYear() - birthday.getFullYear();
  const hasHadBirthday = today.getMonth() > birthday.getMonth()
    || (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
  if (!hasHadBirthday) result -= 1;
  return result > 0 && result <= 120 ? String(result) : '';
}
