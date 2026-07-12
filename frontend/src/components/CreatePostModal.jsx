import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Image as ImageIcon } from 'lucide-react';
import { closeCreatePost } from '../features/ui/uiSlice';
import { postCreated } from '../features/posts/postsSlice';
import { pushToast } from '../features/ui/uiSlice';
import { postsApi } from '../api/resources';

export default function CreatePostModal() {
  const isOpen = useSelector((s) => s.ui.createPostOpen);
  const dispatch = useDispatch();
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleClose = () => {
    setCaption('');
    setFiles([]);
    setPreviews([]);
    dispatch(closeCreatePost());
  };

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) {
      dispatch(pushToast('Add a caption or media to post', 'error'));
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      files.forEach((f) => formData.append('media', f));

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
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind? Use #hashtags and @mentions"
            rows={4}
            className="w-full bg-transparent outline-none placeholder-slate-mute text-[15px] resize-none"
          />

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
