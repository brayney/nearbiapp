import React, { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed } from '../features/posts/postsSlice';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';
import Logo from '../components/Logo';

export default function FeedPage() {
  const dispatch = useDispatch();
  const { items, status, page, hasMore } = useSelector((s) => s.posts);
  const loaderRef = useRef(null);
  const feedScrollRef = useRef(null);

  useEffect(() => {
    dispatch(fetchFeed({ page: 1 }));
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (status !== 'loading' && hasMore) {
      dispatch(fetchFeed({ page: page + 1 }));
    }
  }, [dispatch, status, hasMore, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { root: feedScrollRef.current, rootMargin: '200px' }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--mobile-nav-height))] w-full max-w-xl flex-col md:h-screen md:px-4">
      <div className="z-20 shrink-0 border-b border-ink-line bg-ink/95 backdrop-blur">
        <header className="flex h-[76px] items-center justify-center px-4 md:px-0">
          <Logo size={156} className="max-h-[58px]" />
        </header>
        <StoriesBar />
      </div>

      <div ref={feedScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {status === 'idle' || (status === 'loading' && items.length === 0) ? (
          <FeedSkeleton />
        ) : items.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="mb-2 font-display text-lg">Nothing here yet</p>
            <p className="text-sm text-slate-faint">
              Follow people or create the first post to get your feed going.
            </p>
          </div>
        ) : (
          <>
            {items.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
            <div ref={loaderRef} className="py-8 text-center">
              {status === 'loading' && <span className="font-mono text-sm text-slate-mute">loading more...</span>}
              {!hasMore && items.length > 0 && (
                <span className="text-sm text-slate-mute">You're all caught up</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="px-4 md:px-0 py-4 space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-ink-line" />
            <div className="h-3 w-24 bg-ink-line rounded" />
          </div>
          <div className="h-72 bg-ink-line rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
