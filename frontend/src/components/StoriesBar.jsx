import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Image, Plus, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import { storiesApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB

export default function StoriesBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useSelector((state) => state.auth.user);
  const [stories, setStories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(null);

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (file.size > MAX_MEDIA_SIZE) {
      dispatch(pushToast('Story media must be under 100MB.', 'error'));
      setMedia(null);
      return;
    }
    setMedia(file);
  };

  useEffect(() => {
    if (searchParams.get('story') === 'compose') setCreating(true);
  }, [searchParams]);

  const closeComposer = () => {
    setCreating(false);
    if (searchParams.get('story') === 'compose') navigate('/feed', { replace: true });
  };

  const loadStories = async () => {
    try {
      const { data } = await storiesApi.getAll();
      setStories(data.stories || []);
    } catch {
      dispatch(pushToast('Could not load stories.', 'error'));
    }
  };

  useEffect(() => { loadStories(); }, []);

  const groups = useMemo(() => {
    const byAuthor = new Map();
    stories.forEach((story) => {
      const id = String(story.author?._id || story.author?.id);
      if (!byAuthor.has(id)) byAuthor.set(id, { author: story.author, stories: [] });
      byAuthor.get(id).stories.push(story);
    });
    return [...byAuthor.values()];
  }, [stories]);

  const createStory = async (event) => {
    event.preventDefault();
    if (!text.trim() && !media) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (text.trim()) formData.append('text', text.trim());
      if (media) formData.append('media', media);
      const { data } = await storiesApi.create(formData);
      setStories((items) => [data.story, ...items]);
      setText('');
      setMedia(null);
      closeComposer();
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not create story.', 'error'));
    } finally {
      setSaving(false);
    }
  };

  const openStory = async (story) => {
    setActive(story);
    try { await storiesApi.view(story._id); } catch { /* The story content can still be shown. */ }
  };

  return (
    <>
      <div className="border-b border-ink-line px-4 py-4 md:px-0">
        <div className="flex gap-4 overflow-x-auto pb-1">
          <button type="button" onClick={() => setCreating(true)} className="w-16 shrink-0 rounded-full bg-transparent p-0 text-center text-slate-faint focus:outline-none focus:ring-0" aria-label="Add story">
            <div className="relative mx-auto w-fit rounded-full bg-gradient-to-tr from-orange-400 via-amber-300 to-orange-500 p-0.5">
              <Avatar src={currentUser?.profilePicture?.url} alt={currentUser?.username} size="lg" className="rounded-full bg-ink" />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-coral text-ink"><Plus size={15} /></span>
            </div>
            <span className="mt-1 block truncate text-xs">Your story</span>
          </button>
          {groups.map((group) => (
            <button key={group.author?._id || group.author?.id} type="button" onClick={() => openStory(group.stories[0])} className="w-16 shrink-0 rounded-full bg-transparent p-0 text-center text-slate-faint focus:outline-none focus:ring-0">
              <div className="mx-auto w-fit rounded-full bg-gradient-to-tr from-orange-400 via-amber-300 to-orange-500 p-0.5">
                <Avatar src={group.author?.profilePicture?.url} alt={group.author?.username} size="lg" className="rounded-full bg-ink" />
              </div>
              <span className="mt-1 block truncate text-xs">{group.author?.username}</span>
            </button>
          ))}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-6" onMouseDown={() => !saving && closeComposer()}>
          <form onSubmit={createStory} onMouseDown={(event) => event.stopPropagation()} className="mx-auto flex w-full max-w-md max-h-[calc(100vh-3rem)] flex-col overflow-y-auto rounded-2xl border border-ink-line bg-ink p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl">Add to your story</h2><button type="button" onClick={closeComposer} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft"><X size={18} /></button></div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={280} rows={4} placeholder="Share something…" className="w-full resize-none rounded-xl border border-ink-line bg-ink-soft p-3 text-sm outline-none focus:border-teal-bright" />
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-ink-line px-3 py-2 text-sm text-slate-faint hover:bg-ink-soft"><Image size={18} />{media ? media.name : 'Add photo or video'}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleMediaChange} /></label>
            <p className="mt-2 text-xs text-slate-faint">Max 100MB video or image</p>
            <button type="submit" disabled={saving || (!text.trim() && !media)} className="mt-4 w-full rounded-xl bg-coral py-2.5 font-semibold text-ink disabled:opacity-50">{saving ? 'Sharing…' : 'Share story'}</button>
          </form>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 sm:p-6" onMouseDown={() => setActive(null)}>
          <article onMouseDown={(event) => event.stopPropagation()} className="relative mx-auto flex h-full max-h-[calc(100vh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-ink">
            <button type="button" onClick={() => setActive(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-paper"><X size={18} /></button>
            {active.media?.url ? active.media.type === 'video' ? <video src={active.media.url} controls autoPlay className="h-full w-full object-contain" /> : <img src={active.media.url} alt="Story" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-teal to-ink p-8 text-center font-display text-2xl">{active.text}</div>}
            {active.media?.url && active.text && <p className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 p-5 text-sm">{active.text}</p>}
          </article>
        </div>
      )}
    </>
  );
}
