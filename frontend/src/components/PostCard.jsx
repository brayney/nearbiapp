import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { toggleLike, toggleSave, addComment, removePost } from '../features/posts/postsSlice';
import { postsApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';

function timeAgo(date) { const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000); for (const [label, secondsInUnit] of [['y', 31536000], ['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]]) { const value = Math.floor(seconds / secondsInUnit); if (value >= 1) return `${value}${label}`; } return 'now'; }

export default function PostCard({ post }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?.id || currentUser?._id;
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const comments = post.comments || [];
  const mediaItems = post.media ?? [];
  const selectedMedia = mediaItems[activeMediaIndex];
  const showMediaControls = mediaItems.length > 1;
  const isOwner = String(post.author?._id || post.author?.id) === String(currentUserId);

  useEffect(() => {
    setLiked(Boolean(post._liked ?? post.likes?.some((id) => String(id) === String(currentUserId))));
    setSaved(Boolean(post._saved ?? post.savedBy?.some((id) => String(id) === String(currentUserId))));
    setLikesCount(post.likesCount ?? post.likes?.length ?? 0);
  }, [post, currentUserId]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [post.media]);

  const handleReaction = async () => {
    const result = await dispatch(toggleLike(post._id));
    if (toggleLike.fulfilled.match(result)) { setLiked(result.payload.liked); setLikesCount(result.payload.likesCount); }
    else dispatch(pushToast('Could not update reaction.', 'error'));
  };
  const handleSave = async () => {
    const result = await dispatch(toggleSave(post._id));
    if (toggleSave.fulfilled.match(result)) { setSaved(result.payload.saved); dispatch(pushToast(result.payload.saved ? 'Post saved.' : 'Post removed from saved.', 'success')); }
    else dispatch(pushToast(result.payload || 'Could not update saved posts.', 'error'));
  };
  const handleComment = (event) => { event.preventDefault(); if (!commentText.trim()) return; dispatch(addComment({ postId: post._id, text: commentText.trim() })); setCommentText(''); };
  const handleShare = () => { navigator.clipboard?.writeText(`${window.location.origin}/post/${post._id}`); dispatch(pushToast('Link copied to clipboard', 'success')); };
  const menuAction = async (action) => {
    setShowMenu(false);
    try {
      if (action === 'notInterested') { await postsApi.notInterested(post._id); dispatch(removePost(post._id)); dispatch(pushToast('We’ll show fewer posts like this.', 'default', { type: 'notInterested', post })); }
      if (action === 'interested') { await postsApi.interested(post._id); dispatch(pushToast('We’ll show more posts like this.', 'success')); }
      if (action === 'hide') { await postsApi.hidePost(post._id); dispatch(removePost(post._id)); dispatch(pushToast('Post hidden from your feed.', 'default', { type: 'hide', post })); }
      if (action === 'report') { await postsApi.reportPost(post._id, 'other', 'Reported from post menu.'); dispatch(pushToast('Report sent. Thank you.', 'success')); }
      if (action === 'archive') { const { data } = await postsApi.archivePost(post._id); dispatch(pushToast(data.isArchived ? 'Post archived.' : 'Post restored.', 'success')); }
      if (action === 'pin') { const { data } = await postsApi.pinPost(post._id); dispatch(pushToast(data.isPinned ? 'Post pinned.' : 'Post unpinned.', 'success')); }
    } catch (err) { dispatch(pushToast(err.response?.data?.message || 'This action could not be completed.', 'error')); }
  };

  return <article className="border-b border-ink-line px-4 py-5 md:px-0"><header className="mb-3 flex items-center gap-3"><Link to={`/profile/${post.author?.username}`}><Avatar src={post.author?.profilePicture?.url} alt={post.author?.username} size="sm" /></Link><div><Link to={`/profile/${post.author?.username}`} className="text-sm font-semibold hover:underline">{post.author?.username}</Link><span className="ml-2 font-mono text-xs text-slate-faint">{timeAgo(post.createdAt)}</span></div><div className="relative ml-auto"><button onClick={() => setShowMenu((open) => !open)} className="text-slate-faint hover:text-paper" aria-label="Post options"><MoreHorizontal size={18} /></button>{showMenu && <div className="absolute right-0 top-7 z-20 w-48 overflow-hidden rounded-xl border border-ink-line bg-ink py-1 shadow-xl">{isOwner ? <><MenuButton onClick={() => menuAction('pin')}>Pin / unpin post</MenuButton><MenuButton onClick={() => menuAction('archive')}>Archive / restore post</MenuButton></> : <><MenuButton onClick={() => menuAction('interested')}>Interested</MenuButton><MenuButton onClick={() => menuAction('notInterested')}>Not interested</MenuButton><MenuButton onClick={() => menuAction('hide')}>Hide post</MenuButton><MenuButton danger onClick={() => menuAction('report')}>Report</MenuButton></>}</div>}</div></header>{mediaItems.length > 0 && <div className="mb-3 overflow-hidden rounded-2xl bg-ink-soft relative">
        <div className="relative min-h-[280px] overflow-hidden bg-black/5">
          {selectedMedia?.type === 'video' ? (
            <video
              src={selectedMedia.url}
              controls
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={selectedMedia?.url} alt="" className="h-full w-full object-cover" />
          )}

          {showMediaControls && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMediaIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-paper transition hover:bg-black/60"
                aria-label="Previous media"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMediaIndex((current) => (current + 1) % mediaItems.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-paper transition hover:bg-black/60"
                aria-label="Next media"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute left-1/2 bottom-3 flex -translate-x-1/2 gap-2">
                {mediaItems.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveMediaIndex(index);
                    }}
                    className={`h-2.5 w-2.5 rounded-full transition ${index === activeMediaIndex ? 'bg-paper' : 'bg-white/60'}`}
                    aria-label={`Go to media ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {showMediaControls && (
            <div className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-paper">
              {activeMediaIndex + 1} / {mediaItems.length}
            </div>
          )}
        </div>
      </div>}{post.caption && <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.caption}</p>}<div className="flex items-center gap-5 text-slate-faint"><button onClick={handleReaction} className={`flex items-center gap-1.5 ${liked ? 'text-coral' : 'hover:text-paper'}`} aria-label="Like post"><Heart size={20} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 1.75} /><span className="font-mono text-sm">{likesCount}</span></button><button onClick={() => setShowComments((open) => !open)} className="flex items-center gap-1.5 hover:text-paper"><MessageCircle size={20} /><span className="font-mono text-sm">{comments.length}</span></button><button onClick={handleShare} className="hover:text-paper"><Send size={20} /></button><button onClick={handleSave} className={`ml-auto ${saved ? 'text-coral' : 'hover:text-paper'}`} aria-label="Save post"><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} strokeWidth={saved ? 0 : 1.75} /></button></div>{showComments && <div className="mt-4 space-y-3 pl-1">{comments.map((comment) => <div key={comment._id} className="flex gap-2.5 text-sm"><Avatar src={comment.user?.profilePicture?.url} alt={comment.user?.username} size="sm" /><p><span className="mr-2 font-semibold">{comment.user?.username}</span>{comment.text}</p></div>)}<form onSubmit={handleComment} className="flex items-center gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} className="flex-1 border-b border-ink-line bg-transparent py-1.5 text-sm outline-none focus:border-coral" placeholder="Add a comment..." /><button disabled={!commentText.trim()} className="text-sm font-semibold text-coral disabled:opacity-40">Post</button></form></div>}</article>;
}

function MenuButton({ children, onClick, danger = false }) { return <button onClick={onClick} className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-ink-soft ${danger ? 'text-coral' : 'text-paper'}`}>{children}</button>; }
