import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import FormInput from '../components/FormInput';
import { usersApi } from '../api/resources';
import { authApi } from '../api/auth';
import { pushToast } from '../features/ui/uiSlice';
import { fetchMe } from '../features/auth/authSlice';

const TABS = ['Profile', 'Privacy', 'Password'];

export default function SettingsPage() {
  const [tab, setTab] = useState('Profile');
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl mb-6">Settings</h1>

      <div className="flex gap-1 mb-8 border-b border-ink-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-coral text-paper' : 'border-transparent text-slate-faint hover:text-paper'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && <ProfileTab user={user} dispatch={dispatch} />}
      {tab === 'Privacy' && <PrivacyTab dispatch={dispatch} />}
      {tab === 'Password' && <PasswordTab dispatch={dispatch} />}
    </div>
  );
}

function ProfileTab({ user, dispatch }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    locationLabel: user?.locationLabel || '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  const resendVerification = async () => {
    setResendingVerification(true);
    try {
      await authApi.resendVerification();
      dispatch(pushToast('Verification email sent. Check Inbox and Spam.', 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not send verification email.', 'error'));
    } finally {
      setResendingVerification(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await usersApi.uploadAvatar(formData);
      await dispatch(fetchMe());
      dispatch(pushToast('Profile photo updated', 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Upload failed', 'error'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile(form);
      await dispatch(fetchMe());
      dispatch(pushToast('Profile updated', 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Update failed', 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={user?.profilePicture?.url} alt={user?.username} size="lg" />
        <label className="text-sm font-medium text-teal-bright hover:underline cursor-pointer">
          {avatarUploading ? 'Uploading...' : 'Change photo'}
          <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        </label>
      </div>

      {!user?.isEmailVerified && (
        <div className="mb-6 rounded-xl border border-coral/50 bg-ink-soft p-4">
          <p className="text-sm font-medium">Your email is not verified yet.</p>
          <p className="mt-1 text-sm text-slate-faint">Verify it before using password recovery. The email contains a verification link, not a code.</p>
          <button onClick={resendVerification} disabled={resendingVerification} className="mt-3 text-sm font-semibold text-coral disabled:opacity-50">
            {resendingVerification ? 'Sending…' : 'Resend verification email'}
          </button>
        </div>
      )}

      <FormInput
        label="Display name"
        value={form.displayName}
        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
      />
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-faint mb-1.5">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          maxLength={250}
          className="w-full bg-ink-soft border border-ink-line rounded-xl px-4 py-2.5 text-[15px] outline-none focus:border-teal-bright resize-none"
        />
      </div>
      <FormInput
        label="Location label"
        placeholder="e.g. Ormoc City, PH"
        value={form.locationLabel}
        onChange={(e) => setForm((f) => ({ ...f, locationLabel: e.target.value }))}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-coral text-ink font-semibold px-5 py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

function PrivacyTab({ dispatch }) {
  const [settings, setSettings] = useState({
    accountPrivacy: 'public',
    locationSharing: 'hidden',
    locationVisibility: 'nobody',
    whoCanMessage: 'everyone',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    usersApi.getPrivacy()
      .then(({ data }) => {
        if (active && data.privacySettings) setSettings((current) => ({ ...current, ...data.privacySettings }));
      })
      .catch((err) => {
        if (active) dispatch(pushToast(err.response?.data?.message || 'Could not load privacy settings.', 'error'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dispatch]);

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.updatePrivacy(settings);
      dispatch(pushToast('Privacy settings updated', 'success'));
    } catch (err) {
      dispatch(pushToast('Update failed', 'error'));
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, field, options }) => (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-faint mb-1.5">{label}</label>
      <select
        value={settings[field]}
        onChange={(e) => setSettings((s) => ({ ...s, [field]: e.target.value }))}
        className="w-full bg-ink-soft border border-ink-line rounded-xl px-4 py-2.5 text-[15px] outline-none focus:border-teal-bright"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      {loading && <p className="mb-4 text-sm text-slate-faint">Loading saved privacy settings…</p>}
      <Row label="Account privacy" field="accountPrivacy" options={['public', 'private']} />
      <Row label="Location sharing" field="locationSharing" options={['precise', 'approximate', 'hidden']} />
      <Row
        label="Who can see my location"
        field="locationVisibility"
        options={['everyone', 'followers', 'friends', 'nobody']}
      />
      <Row label="Who can message me" field="whoCanMessage" options={['everyone', 'followers', 'nobody']} />
      <button
        onClick={save}
        disabled={saving || loading}
        className="bg-coral text-ink font-semibold px-5 py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

function PasswordTab({ dispatch }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      dispatch(pushToast('Password changed. Please log in again.', 'success'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm">
      <FormInput
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <FormInput
        label="New password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      {error && <p className="text-coral text-sm mb-4">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-coral text-ink font-semibold px-5 py-2.5 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Change password'}
      </button>
    </form>
  );
}
