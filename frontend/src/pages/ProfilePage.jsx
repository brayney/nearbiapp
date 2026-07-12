import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Grid3x3, Settings, Repeat, X, Bookmark, Plus } from 'lucide-react';
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
  const [reposts, setReposts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [repostsLoading, setRepostsLoading] = useState(false);
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
    navigate('/');
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

  const loadReposts = async () => {
    setRepostsLoading(true);
    try {
      const response = await postsApi.getUserReposts(username);
      setReposts(response.data.posts || []);
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not load reposts.', 'error'));
    } finally {
      setRepostsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved' && isOwner) {
      loadSavedPosts();
    }
    if (activeTab === 'reposts' && isOwner) {
      loadReposts();
    }
  }, [activeTab, isOwner, username]);

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
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <div className="pt-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="relative">
              <Avatar
                src={profile.profilePicture?.url}
                alt={profile.username}
                size="xl"
                online={profile.isOnline}
                className="border-4 border-ink rounded-full"
              />
              {isOwner && (
                <div className="absolute -right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-ink-line bg-ink-soft text-slate-faint">
                  <Plus size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[220px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-semibold tracking-tight">{profile.displayName || profile.username}</span>
                <span className="text-sm text-slate-faint">@{profile.username}</span>
              </div>
              {followsYou && <p className="mt-2 text-sm text-coral">Follows you</p>}
              {profile.bio && <p className="mt-3 text-sm text-slate-faint max-w-2xl">{profile.bio}</p>}
            </div>

            {isOwner ? null : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  className={`min-w-[120px] rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    isFollowing ? 'border border-ink-line bg-ink-soft text-paper hover:bg-ink/80' : 'bg-coral text-ink hover:bg-coral-dim'
                  }`}
                >
                  {isFollowing ? 'Following' : followsYou ? 'Follow Back' : 'Follow'}
                </button>
                <Link
                  to={`/messages?user=${profile.id || profile._id}`}
                  className="min-w-[120px] rounded-2xl border border-ink-line bg-ink-soft px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink"
                >
                  Message
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-ink-line bg-ink-soft px-4 py-4">
              <p className="text-lg font-semibold text-paper">{profile.postsCount ?? 0}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-faint">Posts</p>
            </div>
            <button
              type="button"
              onClick={() => openConnections('followers')}
              className="rounded-2xl border border-ink-line bg-ink-soft px-4 py-4 text-left transition hover:bg-ink"
            >
              <p className="text-lg font-semibold text-paper">{profile.followersCount ?? 0}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-faint">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => openConnections('following')}
              className="rounded-2xl border border-ink-line bg-ink-soft px-4 py-4 text-left transition hover:bg-ink"
            >
              <p className="text-lg font-semibold text-paper">{profile.followingCount ?? 0}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-faint">Following</p>
            </button>
          </div>

          <div className="mt-6 rounded-3xl border border-ink-line bg-[#101010] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-faint">Professional dashboard</p>
                <p className="mt-2 text-sm font-semibold">246 views in the last 30 days.</p>
              </div>
              <button className="rounded-2xl border border-ink-line px-4 py-2 text-sm font-semibold text-paper hover:bg-ink-soft">View</button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto pb-3">
            <div className="flex gap-4">
              <button className="min-w-[96px] rounded-3xl border border-ink-line bg-ink-soft px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-line">+</span>
                <span className="mt-2 block text-xs text-slate-faint">New</span>
              </button>

              <div className="min-w-[96px] rounded-3xl border border-ink-line bg-ink-soft px-4 py-3 text-center">
                <div className="mx-auto mb-2 h-10 w-10 overflow-hidden rounded-full border border-ink-line">
                  <img src={profile.profilePicture?.url} alt={profile.username} className="h-full w-full object-cover" />
                </div>
                <span className="text-xs text-slate-faint">{profile.displayName || profile.username}</span>
              </div>

              <div className="min-w-[96px] rounded-3xl border border-ink-line bg-ink-soft px-4 py-3 text-center">
                <div className="mx-auto mb-2 h-10 w-10 rounded-full border border-ink-line bg-slate-900" />
                <span className="text-xs text-slate-faint">shesh</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-ink-line pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-faint">
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`rounded-full px-4 py-2 transition ${activeTab === 'posts' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
              >
                <Grid3x3 size={14} />
                Posts
              </button>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saved')}
                    className={`rounded-full px-4 py-2 transition ${activeTab === 'saved' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
                  >
                    <Bookmark size={14} />
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reposts')}
                    className={`rounded-full px-4 py-2 transition ${activeTab === 'reposts' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
                  >
                    <Repeat size={14} />
                    Reposts
                  </button>
                </>
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
            )
          ) : activeTab === 'reposts' ? (
            repostsLoading ? (
              <p className="text-slate-mute text-sm py-10">Loading reposts...</p>
            ) : reposts.length === 0 ? (
              <p className="text-slate-faint text-sm py-10 text-center">Reposts will appear here once you share a post.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1 pb-6">
                {reposts.map((post) => (
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
            )
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
