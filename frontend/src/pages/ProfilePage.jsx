import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Settings, Grid3x3 } from 'lucide-react';
import Avatar from '../components/Avatar';
import { usersApi, postsApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';

export default function ProfilePage() {
  const { username } = useParams();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

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
          {isOwner ? (
            <Link
              to="/settings"
              className="flex items-center gap-1.5 text-sm font-medium border border-ink-line rounded-xl px-3 py-2 hover:bg-ink-soft"
            >
              <Settings size={16} /> Edit profile
            </Link>
          ) : (
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

        <h1 className="font-display text-xl flex items-center gap-2">
          {profile.displayName || profile.username}
        </h1>
        <p className="text-slate-faint text-sm mb-3">@{profile.username}</p>
        {followsYou && <p className="text-sm text-coral mb-2">Follows you</p>}
        {profile.bio && <p className="text-[15px] mb-3 max-w-md">{profile.bio}</p>}

        <div className="flex gap-5 text-sm mb-6 font-mono">
          <span>
            <strong className="font-sans">{profile.postsCount}</strong> <span className="text-slate-faint">posts</span>
          </span>
          <span>
            <strong className="font-sans">{profile.followersCount}</strong>{' '}
            <span className="text-slate-faint">followers</span>
          </span>
          <span>
            <strong className="font-sans">{profile.followingCount}</strong>{' '}
            <span className="text-slate-faint">following</span>
          </span>
        </div>

        <div className="flex items-center gap-2 border-t border-ink-line pt-3 mb-1 text-slate-faint text-sm">
          <Grid3x3 size={16} /> Posts
        </div>

        {posts.length === 0 ? (
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
  );
}
