import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Home,
  Compass,
  Search,
  MessageCircle,
  Bell,
  Bookmark,
  PlusSquare,
  User,
  LogOut,
  Radar,
} from 'lucide-react';
import Avatar from './Avatar';
import { logoutUser } from '../features/auth/authSlice';
import { openCreatePost } from '../features/ui/uiSlice';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/nearby', icon: Radar, label: 'Nearby' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
];

function NavItem({ to, icon: Icon, label, end, soon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
          isActive ? 'bg-ink-soft text-paper' : 'text-slate-faint hover:text-paper hover:bg-ink-soft/60'
        }`
      }
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="font-medium text-[15px] hidden lg:inline">{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

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
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <button
          onClick={() => dispatch(openCreatePost())}
          className="mt-2 flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl bg-coral text-ink font-semibold hover:bg-coral-dim transition-colors"
        >
          <PlusSquare size={20} strokeWidth={2} />
          <span className="hidden lg:inline text-[15px]">Create</span>
        </button>

        <div className="mt-6 pt-6 border-t border-ink-line flex items-center gap-3 px-1">
          <button
            onClick={() => navigate(`/profile/${user?.username}`)}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
            <span className="hidden lg:block truncate text-sm font-medium">{user?.username}</span>
          </button>
          <button onClick={handleLogout} className="text-slate-faint hover:text-coral shrink-0" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="h-[100dvh] min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:h-screen md:pb-0">
        <Outlet />
      </main>

      {/* Mobile floating create button */}
      <button
        onClick={() => dispatch(openCreatePost())}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-ink shadow-lg shadow-coral-glow md:hidden"
      >
        <PlusSquare size={24} strokeWidth={2} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-line bg-ink-soft px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:hidden">
        {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], { to: '/messages', icon: MessageCircle }, `profile`, { action: handleLogout, icon: LogOut }].map(
          (item, i) =>
            item === 'profile' ? (
              <button key="profile" onClick={() => navigate(`/profile/${user?.username}`)} className="flex h-11 w-11 items-center justify-center rounded-xl p-1">
                <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
              </button>
            ) : item.action ? (
              <button
                key="logout"
                type="button"
                onClick={item.action}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-faint hover:text-coral"
                aria-label="Log out"
              >
                <item.icon size={22} strokeWidth={1.75} />
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex h-11 w-11 items-center justify-center rounded-xl ${isActive ? 'text-coral' : 'text-slate-faint'}`}
              >
                <item.icon size={22} strokeWidth={1.75} />
              </NavLink>
            )
        )}
      </nav>
    </div>
  );
}
