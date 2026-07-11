import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../features/ui/uiSlice';
import { postsApi } from '../api/resources';
import { restorePost } from '../features/posts/postsSlice';

const TONE_STYLES = {
  default: 'bg-ink-soft border-ink-line text-paper',
  error: 'bg-ink-soft border-coral text-paper',
  success: 'bg-ink-soft border-teal-bright text-paper',
};

export default function ToastStack() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dispatch(dismissToast(t.id))} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.action ? 3000 : 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleUndo = async () => {
    try {
      if (toast.action.type === 'notInterested') await postsApi.interested(toast.action.post._id);
      if (toast.action.type === 'hide') await postsApi.unhidePost(toast.action.post._id);
      dispatch(restorePost(toast.action.post));
      onDismiss();
    } catch {
      onDismiss();
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${TONE_STYLES[toast.tone] || TONE_STYLES.default}`}
    >
      <span>{toast.message}</span>
      {toast.action && <button onClick={handleUndo} className="ml-4 font-semibold text-coral hover:text-paper">Undo</button>}
    </div>
  );
}
