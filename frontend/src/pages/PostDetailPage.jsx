import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { postsApi } from '../api/resources';
import PostCard from '../components/PostCard';

export default function PostDetailPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsApi
      .getPost(postId)
      .then(({ data }) => setPost(data.post))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return <div className="max-w-xl mx-auto px-4 py-10 text-slate-mute text-sm">Loading...</div>;
  if (!post) return <div className="max-w-xl mx-auto px-4 py-10 text-slate-faint text-sm">Post not found.</div>;

  return (
    <div className="max-w-xl mx-auto">
      <PostCard post={post} />
    </div>
  );
}
