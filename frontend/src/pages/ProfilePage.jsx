import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Grid3x3, Repeat, X, Bookmark, Plus } from 'lucide-react';
import Avatar from '../components/Avatar';
import { usersApi, postsApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';
import { logoutUser, setUser } from '../features/auth/authSlice';

export default function ProfilePage() {
  const { username } = useParams();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [repostsLoading, setRepostsLoading] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editData, setEditData] = useState({ displayName: '', username: '', bio: '' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [connections, setConnections] = useState({ type: null, users: [], loading: false });
  const isOwner = Boolean(
    profile &&
    currentUser &&
    (
      (profile.username || '').toLowerCase() === (currentUser.username || '').toLowerCase() ||
      profile.id === currentUser.id ||
      profile.id === currentUser._id ||
      profile._id === currentUser.id ||
      profile._id === currentUser._id
    )
  );
  const menuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([usersApi.getProfile(username), postsApi.getUserPosts(username)])
      .then(([profileRes, postsRes]) => {
        if (cancelled) return;
        const fetchedUser = profileRes.data.user;
        setProfile(fetchedUser);
        setIsFollowing(profileRes.data.isFollowing);
        setFollowsYou(profileRes.data.followsYou);
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

  useEffect(() => {
    if (!profile) return;
    setEditData({
      displayName: profile.displayName || '',
      username: profile.username || '',
      bio: profile.bio || '',
    });
  }, [profile]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await usersApi.updateProfile(editData);
      const updatedUser = response.data?.user || response.data;
      setProfile(updatedUser);
      dispatch(setUser(updatedUser));
      dispatch(pushToast('Profile updated', 'success'));
      setEditing(false);
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not update profile.', 'error'));
    } finally {
      setSavingProfile(false);
    }
  };

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

            {isOwner ? (
              <button
                onClick={() => setEditing(true)}
                className="min-w-[120px] rounded-2xl border border-ink-line bg-ink-soft px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink"
              >
                Edit profile
              </button>
            ) : (
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

          <div className="mt-6 flex flex-wrap items-center justify-start gap-6 text-sm font-semibold text-paper">
            <button type="button" onClick={() => openConnections('posts')} className="text-left text-lg font-semibold text-paper">
              {profile.postsCount ?? 0}
              <span className="block text-xs font-normal text-slate-faint">Posts</span>
            </button>
            <button type="button" onClick={() => openConnections('followers')} className="text-left text-lg font-semibold text-paper">
              {profile.followersCount ?? 0}
              <span className="block text-xs font-normal text-slate-faint">Followers</span>
            </button>
            <button type="button" onClick={() => openConnections('following')} className="text-left text-lg font-semibold text-paper">
              {profile.followingCount ?? 0}
              <span className="block text-xs font-normal text-slate-faint">Following</span>
            </button>
          </div>

          <div className="mt-6 border-t border-ink-line pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-faint">
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${activeTab === 'posts' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
              >
                <Grid3x3 size={14} />
                Posts
              </button>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saved')}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${activeTab === 'saved' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
                  >
                    <Bookmark size={14} />
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reposts')}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${activeTab === 'reposts' ? 'bg-ink-soft text-paper' : 'hover:bg-ink-soft'}`}
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

                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" onMouseDown={() => !savingProfile && setEditing(false)}>
          <form
            onSubmit={handleSaveProfile}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-ink-line bg-ink p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Edit profile</h2>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft" aria-label="Close edit profile">
                <X size={18} />
              </button>
            </div>

            <label className="mb-3 block text-sm font-semibold text-paper">
              Display name
              <input
                value={editData.displayName}
                onChange={(event) => setEditData((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="Display name"
                className="mt-2 w-full rounded-xl border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper outline-none focus:border-teal-bright"
              />
            </label>

            <label className="mb-3 block text-sm font-semibold text-paper">
              Username
              <input
                value={editData.username}
                onChange={(event) => setEditData((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username"
                className="mt-2 w-full rounded-xl border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper outline-none focus:border-teal-bright"
              />
            </label>

            <label className="mb-4 block text-sm font-semibold text-paper">
              Bio
              <textarea
                value={editData.bio}
                onChange={(event) => setEditData((prev) => ({ ...prev, bio: event.target.value }))}
                rows={4}
                placeholder="Tell people about yourself"
                className="mt-2 w-full resize-none rounded-xl border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper outline-none focus:border-teal-bright"
              />
            </label>

            <button
              type="submit"
              disabled={savingProfile || !editData.username.trim()}
              className="w-full rounded-xl bg-coral py-2.5 text-sm font-semibold text-ink transition disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}

      {connections.type && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="connections-title" onMouseDown={closeConnections}>
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl border border-ink-line bg-ink shadow-2xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
              <h2 id="connections-title" className="font-display text-lg capitalize">{connections.type}</h2>
              <button type="button" onClick={closeConnections} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft hover:text-paper" aria-label="Close">
                <X size={18} />
              </button>
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
