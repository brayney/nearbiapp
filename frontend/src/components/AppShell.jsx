import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Home,
  Compass,
  Search,
  MessageCircle,
  Bell,
  Bookmark,
  PlusSquare,
  Radar,
} from 'lucide-react';
import Avatar from './Avatar';
import SiteFooter from './SiteFooter';
import { logoutUser } from '../features/auth/authSlice';
import { openCreatePost } from '../features/ui/uiSlice';
import { messagesApi, notificationsApi } from '../api/resources';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/nearby', icon: Radar, label: 'Nearby' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
];

function NavItem({ to, icon: Icon, label, end, soon, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
          isActive ? 'bg-ink-soft text-paper' : 'text-slate-faint hover:text-paper hover:bg-ink-soft/60'
        }`
      }
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="font-medium text-[15px] hidden lg:inline">{label}</span>
      {badge > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-ink lg:right-4">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [messagesCount, setMessagesCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const loadBadges = async () => {
    try {
      const [messagesRes, notificationsRes] = await Promise.all([
        messagesApi.getConversations(),
        notificationsApi.getNotifications(),
      ]);
      const conversations = messagesRes.data.conversations || [];
      const unreadMessages = conversations.reduce((acc, conversation) => acc + (conversation.unread || 0), 0);
      const notifications = notificationsRes.data.notifications || [];
      const unreadNotifications = notifications.filter((item) => !item.read).length;
      setMessagesCount(unreadMessages);
      setNotificationsCount(unreadNotifications);
    } catch {
      setMessagesCount(0);
      setNotificationsCount(0);
    }
  };

  useEffect(() => {
    loadBadges();
  }, [location.pathname]);

  const navItems = NAV_ITEMS.map((item) => {
    if (item.to === '/messages') return { ...item, badge: messagesCount };
    if (item.to === '/notifications') return { ...item, badge: notificationsCount };
    return item;
  });

  const showMobileCreate = ['/','/explore'].includes(location.pathname);
  const mobileNavItems = [navItems[0], navItems[1], navItems[5], navItems[4]];

  return (
    <div className="flex min-h-[100dvh] bg-ink text-paper md:h-screen md:overflow-hidden">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden h-[100dvh] shrink-0 overflow-y-auto border-r border-ink-line px-2 py-6 md:flex md:flex-col md:w-[76px] lg:w-64 lg:px-4">
        <div className="px-2 mb-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center font-display text-ink font-semibold">
            n
          </div>
          <span className="hidden lg:inline font-display text-xl tracking-tight">nearbi</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {showMobileCreate && (
          <button
            onClick={() => dispatch(openCreatePost())}
            className="mt-2 flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl bg-coral text-ink font-semibold hover:bg-coral-dim transition-colors"
          >
            <PlusSquare size={20} strokeWidth={2} />
            <span className="hidden lg:inline text-[15px]">Create</span>
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-ink-line flex items-center gap-3 px-1">
          <button
            onClick={() => navigate(`/profile/${user?.username}`)}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
            <span className="hidden lg:block truncate text-sm font-medium">{user?.username}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex h-[100dvh] min-w-0 flex-1 flex-col overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:h-screen md:pb-0">
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
      </main>

      {/* Mobile floating create button */}
      {showMobileCreate && (
        <button
          onClick={() => dispatch(openCreatePost())}
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-ink shadow-lg shadow-coral-glow md:hidden"
        >
          <PlusSquare size={24} strokeWidth={2} />
        </button>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-line bg-ink-soft px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:hidden">
        {[mobileNavItems[0], mobileNavItems[1], mobileNavItems[2], mobileNavItems[3], 'profile'].map(
          (item) =>
            item === 'profile' ? (
              <button key="profile" onClick={() => navigate(`/profile/${user?.username}`)} className="flex h-11 w-11 items-center justify-center rounded-xl p-1">
                <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `relative flex h-11 w-11 items-center justify-center rounded-xl ${isActive ? 'text-coral' : 'text-slate-faint'}`}
              >
                <item.icon size={22} strokeWidth={1.75} />
                {item.badge > 0 && (
                  <span className="absolute right-0 top-0 rounded-full bg-coral px-1.5 text-[11px] font-semibold text-ink">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
        )}
      </nav>
    </div>
  );
}
