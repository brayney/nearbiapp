import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { postsApi } from '../api/resources';
import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';
import { toggleLike } from '../features/posts/postsSlice';

export default function ExplorePage() {
  const dispatch = useDispatch();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsApi
      .getTrending()
      .then(({ data }) => {
        setPosts(data.posts);
      })
      .catch((err) => dispatch(pushToast(err.response?.data?.message || 'Could not load trending posts.', 'error')))
      .finally(() => setLoading(false));
  }, [dispatch]);

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
                  className="absolute bottom-2 left-2 z-20 rounded-full bg-black/45 p-2 text-paper transition hover:bg-black/70 hover:text-coral"
                  aria-label="React to post"
                >
                  <Heart size={16} fill={post._liked ? 'currentColor' : 'none'} strokeWidth={post._liked ? 0 : 1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
