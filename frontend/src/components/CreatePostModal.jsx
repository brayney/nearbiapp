import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Image as ImageIcon } from 'lucide-react';
import { closeCreatePost } from '../features/ui/uiSlice';
import { postCreated } from '../features/posts/postsSlice';
import { pushToast } from '../features/ui/uiSlice';
import { postsApi } from '../api/resources';
import { usersApi } from '../api/resources';
import Avatar from './Avatar';

const MAX_MEDIA_FILES = 10;

export default function CreatePostModal() {
  const isOpen = useSelector((s) => s.ui.createPostOpen);
  const dispatch = useDispatch();
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [mention, setMention] = useState(null);
  const [mentionUsers, setMentionUsers] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !mention) {
      setMentionUsers([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      usersApi.getMentionSuggestions(mention.query)
        .then(({ data }) => !cancelled && setMentionUsers(data.users || []))
        .catch(() => !cancelled && setMentionUsers([]));
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, mention]);

  if (!isOpen) return null;

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    const nextFiles = [...files, ...selected].slice(0, MAX_MEDIA_FILES);
    const nextPreviews = nextFiles.map((file) => {
      const preview = previews[files.findIndex((item) => item === file)] || URL.createObjectURL(file);
      return preview;
    });

    setFiles(nextFiles);
    setPreviews(nextPreviews);
    event.target.value = '';
  };

  const handleClose = () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setCaption('');
    setFiles([]);
    setPreviews([]);
    setMention(null);
    setMentionUsers([]);
    dispatch(closeCreatePost());
  };

  const handleCaptionChange = (event) => {
    const value = event.target.value;
    const cursor = event.target.selectionStart ?? value.length;
    const match = value.slice(0, cursor).match(/(^|\s)@([a-zA-Z0-9._]*)$/);
    setCaption(value);
    setMention(match ? { query: match[2], start: cursor - match[2].length - 1, end: cursor } : null);
  };

  const insertMention = (user) => {
    if (!mention) return;
    const value = `${caption.slice(0, mention.start)}@${user.username} ${caption.slice(mention.end)}`;
    const cursor = mention.start + user.username.length + 2;
    setCaption(value);
    setMention(null);
    setMentionUsers([]);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) {
      dispatch(pushToast('Add a caption or media to post', 'error'));
      return;
    }

    if (files.length > MAX_MEDIA_FILES) {
      dispatch(pushToast(`You can attach up to ${MAX_MEDIA_FILES} media items.`, 'error'));
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      files.forEach((file) => formData.append('media', file));

      const { data } = await postsApi.createPost(formData);
      dispatch(postCreated(data.post));
      dispatch(pushToast('Posted', 'success'));
      handleClose();
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Failed to create post', 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-line bg-ink-soft sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-line">
          <h2 className="font-display text-lg">New post</h2>
          <button onClick={handleClose} className="text-slate-faint hover:text-paper">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={handleCaptionChange}
              onBlur={() => window.setTimeout(() => setMention(null), 150)}
              placeholder="What's on your mind? Use #hashtags and @mentions"
              rows={4}
              className="w-full bg-transparent outline-none placeholder-slate-mute text-[15px] resize-none"
              aria-autocomplete="list"
              aria-expanded={Boolean(mention && mentionUsers.length)}
            />
            {mention && mentionUsers.length > 0 && (
              <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-ink-line bg-ink shadow-xl">
                {mentionUsers.map((user) => (
                  <button key={user._id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(user)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-ink-soft">
                    <Avatar src={user.profilePicture?.url} alt={user.username} size="sm" />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.displayName || user.username}</span><span className="block truncate text-xs text-slate-faint">@{user.username}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-slate-faint hover:text-paper cursor-pointer text-sm font-medium">
            <ImageIcon size={18} />
            Add photos or video
            <input type="file" accept="image/*,video/*" multiple hidden onChange={handleFiles} />
          </label>
        </div>

        <footer className="px-5 py-4 border-t border-ink-line flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-coral text-ink font-semibold px-5 py-2 rounded-xl hover:bg-coral-dim disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Posting...' : 'Share'}
          </button>
        </footer>
      </div>
    </div>
  );
}
