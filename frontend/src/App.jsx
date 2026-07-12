import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchMe, forceLogout } from './features/auth/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import ToastStack from './components/ToastStack';
import CreatePostModal from './components/CreatePostModal';
import SiteFooter from './components/SiteFooter';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage, { VerifyEmailPendingPage } from './pages/VerifyEmailPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import SearchPage from './pages/SearchPage';
import SavedPage from './pages/SavedPage';
import NearbyPage from './pages/NearbyPage';
import PostDetailPage from './pages/PostDetailPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import LandingPage from './pages/LandingPage';

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    const onLogout = () => {
      dispatch(forceLogout());
      navigate('/');
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [dispatch, navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email-pending" element={<VerifyEmailPendingPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/nearby" element={<NearbyPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/post/:postId" element={<PostDetailPage />} />

            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastStack />
        <CreatePostModal />
      </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-paper">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="font-display text-3xl mb-2">404</p>
          <p className="text-slate-faint text-sm">This page doesn't exist.</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
