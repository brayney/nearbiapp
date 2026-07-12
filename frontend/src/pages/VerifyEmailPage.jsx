import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../api/auth';

export function VerifyEmailPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const resend = async () => { setStatus('sending'); try { await authApi.resendVerification(); setStatus('sent'); } catch (err) { setStatus(err.response?.data?.message || 'Could not resend verification email.'); } };
  return <AuthLayout title="Email verification is optional" subtitle="You can use every feature without verifying your email"><div className="text-center"><p className="mb-5 text-sm text-slate-faint">Password recovery uses the details you provided when creating your account. You may still verify <span className="font-medium text-paper">{location.state?.email || 'your email address'}</span> later.</p><button onClick={resend} disabled={status === 'sending'} className="rounded-xl bg-coral px-5 py-2.5 font-semibold text-ink disabled:opacity-50">{status === 'sending' ? 'Sending…' : 'Verify email (optional)'}</button><button type="button" onClick={() => navigate('/')} className="mt-4 block text-sm font-semibold text-teal-bright hover:underline">Continue to nearbi</button>{status === 'sent' && <p className="mt-3 text-sm text-teal-bright">Verification email sent.</p>}{status !== 'idle' && status !== 'sending' && status !== 'sent' && <p className="mt-3 text-sm text-coral">{status}</p>}<Link to="/login" className="mt-6 block text-sm text-teal-bright hover:underline">Back to login</Link></div></AuthLayout>;
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  useEffect(() => { const token = params.get('token'); if (!token) { setStatus('This verification link is invalid.'); return; } authApi.verifyEmail(token).then(() => setStatus('verified')).catch((err) => setStatus(err.response?.data?.message || 'Verification failed.')); }, [params]);
  return <AuthLayout title="Email verification" subtitle="Confirming your email address"><div className="text-center">{status === 'verifying' && <p className="text-sm text-slate-faint">Verifying your email…</p>}{status === 'verified' && <><p className="text-sm text-teal-bright">Your email is verified. Account recovery also works without email verification.</p><Link to="/" className="mt-6 block text-sm text-teal-bright hover:underline">Continue to nearbi</Link></>}{status !== 'verifying' && status !== 'verified' && <p className="text-sm text-coral">{status}</p>}</div></AuthLayout>;
}
