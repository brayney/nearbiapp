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
    <div className="min-h-screen bg-ink text-paper flex overflow-hidden">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex md:flex-col w-[76px] lg:w-64 shrink-0 border-r border-ink-line px-2 lg:px-4 py-6 h-screen overflow-y-auto">
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
      <main className="flex-1 min-w-0 pb-16 md:pb-0 overflow-y-auto h-screen">
        <Outlet />
      </main>

      {/* Mobile floating create button */}
      <button
        onClick={() => dispatch(openCreatePost())}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-coral text-ink flex items-center justify-center shadow-lg shadow-coral-glow z-40"
      >
        <PlusSquare size={24} strokeWidth={2} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ink-soft border-t border-ink-line flex items-center justify-around py-2 z-40">
        {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], { to: '/messages', icon: MessageCircle }, `profile`].map(
          (item, i) =>
            item === 'profile' ? (
              <button key="profile" onClick={() => navigate(`/profile/${user?.username}`)} className="p-2">
                <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `p-2 ${isActive ? 'text-coral' : 'text-slate-faint'}`}
              >
                <item.icon size={22} strokeWidth={1.75} />
              </NavLink>
            )
        )}
      </nav>
    </div>
  );
}
