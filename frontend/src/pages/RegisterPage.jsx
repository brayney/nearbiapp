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

  const [form, setForm] = useState({
    username: '', email: '', password: '', displayName: '', birthday: '', gender: '', nationality: '', favoritePet: '',
  });
  const age = form.birthday ? calculateAge(form.birthday) : '';

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthLayout title="Join nearbi" subtitle="Connect with the people actually around you">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <section className="rounded-3xl border border-ink-line bg-ink-soft p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-faint mb-5">Account details</h2>
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
          </section>

          <section className="rounded-3xl border border-ink-line bg-ink-soft p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-faint mb-5">Recovery information</h2>
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
            <FormInput label="Favorite pet" value={form.favoritePet} onChange={update('favoritePet')} autoComplete="off" required />
            <p className="text-xs text-slate-faint -mt-2 mb-4">These recovery details help reset your password. Email verification is optional.</p>
          </section>
        </div>

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

function calculateAge(value) {
  const birthday = new Date(`${value}T00:00:00`);
  const today = new Date();
  let result = today.getFullYear() - birthday.getFullYear();
  const hasHadBirthday = today.getMonth() > birthday.getMonth()
    || (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());
  if (!hasHadBirthday) result -= 1;
  return result > 0 && result <= 120 ? String(result) : '';
}
