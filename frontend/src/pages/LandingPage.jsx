import React, { useEffect, useState } from 'react';
import { ArrowRight, Download, Phone, Sparkles, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/feed', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const onAppInstalled = () => {
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-[100dvh] bg-ink text-paper">
      <header className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral text-ink text-xl font-bold">n</div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-faint">nearbi</p>
              <p className="text-xs text-slate-faint">Social chat for local connections</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-2xl border border-ink-line px-4 py-2 text-sm font-semibold transition hover:border-teal-bright hover:text-teal-bright"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-2xl bg-coral px-4 py-2 text-sm font-semibold text-ink transition hover:bg-coral-dim"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-coral/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-coral shadow-sm shadow-coral/10">
                <Sparkles size={16} /> Installed, private, fast
              </p>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Stay close to the people around you.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-faint">
                nearbi is a modern social messaging experience with local discovery, stories, reposts, and a polished installable web app UI.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-coral px-5 py-3 text-sm font-semibold text-ink transition hover:bg-coral-dim"
              >
                Create account
                <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                onClick={handleInstall}
                disabled={!installPrompt && !installed}
                className="inline-flex items-center gap-2 rounded-2xl border border-ink-line bg-ink-soft px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={18} />
                {installed ? 'App installed' : installPrompt ? 'Install the app' : 'Install from browser'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-ink-line bg-ink-soft p-6 shadow-sm shadow-black/5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-faint">Local by design</p>
                <h2 className="mt-3 text-xl font-semibold">Find people nearby</h2>
                <p className="mt-2 text-sm text-slate-faint">Discover and message people in your area with an experience built for quick, personal connection.</p>
              </div>
              <div className="rounded-3xl border border-ink-line bg-ink-soft p-6 shadow-sm shadow-black/5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-faint">Safe and inviting</p>
                <h2 className="mt-3 text-xl font-semibold">Modern chat and stories</h2>
                <p className="mt-2 text-sm text-slate-faint">Share status notes, replies, reposts, and enjoy a thoughtful UI designed for social ease.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-ink-line bg-ink p-6 shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-3 rounded-3xl bg-[#121212] p-5">
              <div>
                <p className="text-sm text-slate-faint uppercase tracking-[0.24em]">Installable PWA</p>
                <h2 className="mt-3 text-2xl font-semibold">Add to your home screen</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-coral text-ink">
                <Phone size={22} />
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-slate-faint">
              <p>Use the browser install prompt to save nearbi like a native app.</p>
              <p>Tap the install button, then choose Add to Home screen on mobile or Install on desktop.</p>
            </div>
            <div className="mt-6 grid gap-3">
              <div className="rounded-3xl border border-ink-line bg-ink-soft p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-faint">Step 1</p>
                <p className="mt-2 text-sm">Create an account or log in to start your feed.</p>
              </div>
              <div className="rounded-3xl border border-ink-line bg-ink-soft p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-faint">Step 2</p>
                <p className="mt-2 text-sm">Tap the install button and follow your browser’s prompt.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-line bg-ink-soft py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <FeatureCard title="Fast messaging" description="Send text, photo, and media messages instantly." />
            <FeatureCard title="Reposts & replies" description="Keep conversations moving with reposts and account notes." />
            <FeatureCard title="Secure identity" description="Control who can message you and keep your profile private." />
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line py-10 text-center text-sm text-slate-faint">
        <p>nearbi is an installable web app experience that works in Chrome, Edge, Safari, and other modern browsers.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-ink-line bg-ink p-6 text-left shadow-sm shadow-black/10">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-coral/15 text-coral">
        <ShieldCheck size={20} />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-faint">{description}</p>
    </div>
  );
}
