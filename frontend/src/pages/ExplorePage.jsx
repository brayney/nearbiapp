import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';
import { postsApi, usersApi } from '../api/resources';
import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';
import { addComment, toggleLike } from '../features/posts/postsSlice';

export default function ExplorePage() {
  const dispatch = useDispatch();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [draftComment, setDraftComment] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followedBackIds, setFollowedBackIds] = useState(new Set());

  useEffect(() => {
    postsApi
      .getTrending()
      .then(({ data }) => {
        setPosts(data.posts);
        setFollowingIds(
          new Set(
            data.posts
              .filter((post) => post.author?.isFollowing)
              .map((post) => String(post.author._id))
          )
        );
        setFollowedBackIds(
          new Set(
            data.posts
              .filter((post) => post.author?.isFollowedBack)
              .map((post) => String(post.author._id))
          )
        );
      })
      .catch((err) => dispatch(pushToast(err.response?.data?.message || 'Could not load trending posts.', 'error')))
      .finally(() => setLoading(false));
  }, [dispatch]);

  const handleToggleFollow = async (authorId, currentlyFollowing) => {
    if (!authorId) return;

    try {
      if (currentlyFollowing) {
        await usersApi.unfollow(authorId);
        setFollowingIds((current) => {
          const next = new Set(current);
          next.delete(authorId);
          return next;
        });
      } else {
        await usersApi.follow(authorId);
        setFollowingIds((current) => new Set(current).add(authorId));
      }
    } catch (error) {
      dispatch(pushToast(error.response?.data?.message || 'Could not update follow state.', 'error'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-ink-line bg-ink/95 px-4 py-4 backdrop-blur"><h1 className="font-display text-2xl">Explore</h1></header>

      {loading ? (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-ink-soft animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-slate-faint text-sm">No trending posts yet this week.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {posts.map((post) => {
            const authorId = String(post.author?._id || '');
            const isFollowing = authorId ? followingIds.has(authorId) : false;
            const isFollowedBack = authorId ? followedBackIds.has(authorId) : false;
            return (
              <div key={post._id} className="aspect-square bg-ink-soft overflow-hidden group relative">
                <Link to={`/post/${post._id}`} className="absolute inset-0 z-0" aria-label={`View post by ${post.author?.username || 'Unknown'}`} />
                {post.media?.[0] ? (
                  <img src={post.media[0].url} alt="" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-xs text-slate-faint text-center pointer-events-none">
                    {post.caption?.slice(0, 60)}
                  </div>
                )}

                {post.media?.length > 1 && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-paper">
                    {post.media.length}
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-black/35 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100" />
                <div className="absolute inset-x-0 top-0 z-20 p-2 opacity-100 transition-opacity duration-200 sm:p-3 sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink/90 px-3 py-2 text-sm text-paper backdrop-blur">
                    <span className="truncate font-semibold">{post.author?.username || 'Unknown'}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleToggleFollow(authorId, isFollowing);
                      }}
                      className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs text-paper transition-colors ${
                        isFollowing ? 'border-ink-line bg-ink/90 text-slate-faint' : 'border-ink-line bg-coral text-ink hover:border-coral hover:bg-coral-dim hover:text-ink'
                      }`}
                    >
                      <UserPlus size={14} />
                      {isFollowing ? (isFollowedBack ? 'Followed' : 'Following') : 'Follow'}
                    </button>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-20 p-2 opacity-100 transition-opacity duration-200 sm:p-3 sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink/90 px-3 py-2 text-slate-faint backdrop-blur">
                    <button
                      type="button"
                      onClick={async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const result = await dispatch(toggleLike(post._id));
                        if (toggleLike.fulfilled.match(result)) {
                          setPosts((current) =>
                            current.map((item) =>
                              item._id === post._id
                                ? { ...item, likesCount: result.payload.likesCount, _liked: result.payload.liked }
                                : item
                            )
                          );
                        } else {
                          dispatch(pushToast('Could not like post.', 'error'));
                        }
                      }}
                      className="flex items-center gap-2 text-paper hover:text-coral"
                    >
                      <Heart size={16} fill={post._liked ? 'currentColor' : 'none'} strokeWidth={post._liked ? 0 : 1.75} />
                      <span className="text-xs">React</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveCommentId(post._id);
                      }}
                      className="flex items-center gap-2 text-paper hover:text-coral"
                    >
                      <MessageCircle size={16} />
                      <span className="text-xs">Comment</span>
                    </button>
                  </div>
                </div>
                {activeCommentId === post._id && (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!draftComment.trim()) return;

                      const result = await dispatch(addComment({ postId: post._id, text: draftComment.trim() }));
                      if (addComment.fulfilled.match(result)) {
                        setDraftComment('');
                        setActiveCommentId(null);
                        dispatch(pushToast('Comment added.', 'success'));
                      } else {
                        dispatch(pushToast('Could not add comment.', 'error'));
                      }
                    }}
                    className="absolute inset-x-0 bottom-16 z-20 px-3 py-3"
                  >
                    <div className="rounded-2xl bg-ink/95 p-3 shadow-xl ring-1 ring-white/10">
                      <textarea
                        value={draftComment}
                        onChange={(event) => setDraftComment(event.target.value)}
                        className="w-full resize-none rounded-xl border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-coral"
                        rows={3}
                        placeholder="Write a comment..."
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-ink hover:bg-coral-dim"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
