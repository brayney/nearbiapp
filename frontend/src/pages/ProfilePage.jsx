import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Grid3x3, MoreVertical, X, Bookmark } from 'lucide-react';
import Avatar from '../components/Avatar';
import { usersApi, postsApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';
import { logoutUser } from '../features/auth/authSlice';

export default function ProfilePage() {
  const { username } = useParams();
  const dispatch = useDispatch();

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [connections, setConnections] = useState({ type: null, users: [], loading: false });
  const menuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([usersApi.getProfile(username), postsApi.getUserPosts(username)])
      .then(([profileRes, postsRes]) => {
        if (cancelled) return;
        setProfile(profileRes.data.user);
        setIsFollowing(profileRes.data.isFollowing);
        setFollowsYou(profileRes.data.followsYou);
        setIsOwner(profileRes.data.isOwner);
        setPosts(postsRes.data.posts);
      })
      .catch(() => {
        if (!cancelled) dispatch(pushToast('Could not load this profile', 'error'));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [username, dispatch]);

  const navigate = useNavigate();
  const handleFollowToggle = async () => {
    if (!profile) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(profile.id);
        setIsFollowing(false);
        setProfile((p) => ({ ...p, followersCount: p.followersCount - 1 }));
      } else {
        await usersApi.follow(profile.id);
        setIsFollowing(true);
        setProfile((p) => ({ ...p, followersCount: p.followersCount + 1 }));
      }
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Action failed', 'error'));
    } finally {
      setFollowBusy(false);
    }
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await dispatch(logoutUser());
    navigate('/login');
  };

  const loadSavedPosts = async () => {
    setSavedLoading(true);
    try {
      const response = await postsApi.getSaved();
      setSavedPosts(response.data.posts || []);
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not load saved posts.', 'error'));
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved' && isOwner) {
      loadSavedPosts();
    }
  }, [activeTab, isOwner]);

  const openConnections = async (type) => {
    if (!profile) return;

    setConnections({ type, users: [], loading: true });
    try {
      const response = type === 'followers'
        ? await usersApi.getFollowers(profile.username)
        : await usersApi.getFollowing(profile.username);
      setConnections({ type, users: response.data[type] || [], loading: false });
    } catch (err) {
      setConnections({ type: null, users: [], loading: false });
      dispatch(pushToast(err.response?.data?.message || `Could not load ${type}`, 'error'));
    }
  };

  const closeConnections = () => setConnections({ type: null, users: [], loading: false });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse text-slate-mute">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="font-display text-lg mb-1">User not found</p>
        <p className="text-slate-faint text-sm">@{username} doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-40 md:h-56 bg-ink-soft relative">
        {profile.coverPhoto?.url && (
          <img src={profile.coverPhoto.url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 md:px-0">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <Avatar
            src={profile.profilePicture?.url}
            alt={profile.username}
            size="xl"
            online={profile.isOnline}
            className="border-4 border-ink rounded-full"
          />
          {isOwner ? null : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleFollowToggle}
                disabled={followBusy}
                className={`text-sm font-semibold rounded-xl px-4 py-2 transition-colors ${
                  isFollowing ? 'border border-ink-line hover:bg-ink-soft' : 'bg-coral text-ink hover:bg-coral-dim'
                }`}
              >
                {isFollowing ? 'Following' : followsYou ? 'Follow Back' : 'Follow'}
              </button>
              <Link
                to={`/messages?user=${profile.id || profile._id}`}
                className="text-sm font-semibold rounded-xl border border-ink-line px-4 py-2 hover:bg-ink-soft"
              >
                Message
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl flex items-center gap-2">
            {profile.displayName || profile.username}
          </h1>
          {isOwner && (
            <div className="relative -mt-1" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((open) => !open)}
                className="rounded-full p-2 text-slate-faint transition hover:bg-ink-soft hover:text-paper"
                aria-label="Open profile actions"
                aria-expanded={showProfileMenu}
              >
                <MoreVertical size={20} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-ink-line bg-ink py-2 shadow-xl">
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2 text-sm text-paper hover:bg-ink-soft">Settings</Link>
                  <Link to="/settings?tab=Privacy" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2 text-sm text-paper hover:bg-ink-soft">Privacy</Link>
                  <button type="button" onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-coral hover:bg-ink-soft">Log out</button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-slate-faint text-sm mb-3">@{profile.username}</p>
        {followsYou && <p className="text-sm text-coral mb-2">Follows you</p>}
        {profile.bio && <p className="text-[15px] mb-3 max-w-md">{profile.bio}</p>}

        <div className="flex gap-5 text-sm mb-6 font-mono">
          <span>
            <strong className="font-sans">{profile.postsCount}</strong> <span className="text-slate-faint">posts</span>
          </span>
          <button type="button" onClick={() => openConnections('followers')} className="text-left hover:text-paper transition-colors" aria-label={`View ${profile.username}'s followers`}>
            <strong className="font-sans">{profile.followersCount}</strong>{' '}
            <span className="text-slate-faint">followers</span>
          </button>
          <button type="button" onClick={() => openConnections('following')} className="text-left hover:text-paper transition-colors" aria-label={`View who ${profile.username} follows`}>
            <strong className="font-sans">{profile.followingCount}</strong>{' '}
            <span className="text-slate-faint">following</span>
          </button>
        </div>

        <div className="mb-4 border-t border-ink-line pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-faint">
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${activeTab === 'posts' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
            >
              <Grid3x3 size={14} />
              Posts
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${activeTab === 'saved' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
              >
                <Bookmark size={14} />
                Saved
              </button>
            )}
          </div>
        </div>

        {activeTab === 'saved' ? (
          savedLoading ? (
            <p className="text-slate-mute text-sm py-10">Loading saved posts...</p>
          ) : savedPosts.length === 0 ? (
            <p className="text-slate-faint text-sm py-10 text-center">Saved posts will appear here.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 pb-6">
              {savedPosts.map((post) => (
              <Link
                key={post._id}
                to={`/post/${post._id}`}
                className="aspect-square bg-ink-soft overflow-hidden"
              >
                {post.media?.[0] ? (
                  <img src={post.media[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-xs text-slate-faint text-center">
                    {post.caption?.slice(0, 60)}
                  </div>
                )}
                {post.media?.length > 1 && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-paper">
                    {post.media.length}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-slate-mute text-sm py-10 text-center">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1 pb-6">
            {posts.map((post) => (
              <Link
                key={post._id}
                to={`/post/${post._id}`}
                className="aspect-square bg-ink-soft overflow-hidden"
              >
                {post.media?.[0] ? (
                  <img src={post.media[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-xs text-slate-faint text-center">
                    {post.caption?.slice(0, 60)}
                  </div>
                )}
                {post.media?.length > 1 && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-paper">
                    {post.media.length}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {connections.type && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="connections-title" onMouseDown={closeConnections}>
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl border border-ink-line bg-ink shadow-2xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
              <h2 id="connections-title" className="font-display text-lg capitalize">{connections.type}</h2>
              <button type="button" onClick={closeConnections} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft hover:text-paper" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="max-h-[calc(80vh-57px)] overflow-y-auto p-2">
              {connections.loading ? (
                <p className="py-8 text-center text-sm text-slate-faint">Loading {connections.type}...</p>
              ) : connections.users.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-faint">No {connections.type} yet.</p>
              ) : (
                connections.users.map((user) => (
                  <Link key={user._id} to={`/profile/${user.username}`} onClick={closeConnections} className="flex items-center gap-3 rounded-xl p-3 hover:bg-ink-soft">
                    <Avatar src={user.profilePicture?.url} alt={user.username} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.displayName || user.username}</p>
                      <p className="truncate text-sm text-slate-faint">@{user.username}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
