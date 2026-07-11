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
      <header className="px-4 md:px-0 py-4">
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
