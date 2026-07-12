import React, { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed } from '../features/posts/postsSlice';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';

export default function FeedPage() {
  const dispatch = useDispatch();
  const { items, status, page, hasMore } = useSelector((s) => s.posts);
  const loaderRef = useRef(null);

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
      { rootMargin: '200px' }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="max-w-xl mx-auto px-0 md:px-4">
      <header className="sticky top-0 bg-ink/90 backdrop-blur border-b border-ink-line px-4 md:px-0 py-4 z-10">
        <h1 className="font-display text-xl">Home</h1>
      </header>
      <StoriesBar />

      {status === 'idle' || (status === 'loading' && items.length === 0) ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="font-display text-lg mb-2">Nothing here yet</p>
          <p className="text-slate-faint text-sm">
            Follow people or create the first post to get your feed going.
          </p>
        </div>
      ) : (
        <>
          {items.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
          <div ref={loaderRef} className="py-8 text-center">
            {status === 'loading' && <span className="text-slate-mute text-sm font-mono">loading more...</span>}
            {!hasMore && items.length > 0 && (
              <span className="text-slate-mute text-sm">You're all caught up</span>
            )}
          </div>
        </>
      )}
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
