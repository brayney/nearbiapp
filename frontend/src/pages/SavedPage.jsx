import React, { useEffect, useState } from 'react';
import { postsApi } from '../api/resources';
import PostCard from '../components/PostCard';

export default function SavedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsApi
      .getSaved()
      .then(({ data }) => setPosts(data.posts))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <header className="sticky top-0 z-10 border-b border-ink-line bg-ink/95 px-4 py-4 backdrop-blur md:px-0">
        <h1 className="font-display text-xl">Saved</h1>
      </header>

      {loading ? (
        <p className="text-slate-mute text-sm px-4">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-slate-faint text-sm px-4 py-10 text-center">
          Posts you save will show up here.
        </p>
      ) : (
        posts.map((post) => <PostCard key={post._id} post={post} />)
      )}
    </div>
  );
}
