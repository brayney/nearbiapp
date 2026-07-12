import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Image, Info, Plus, Send, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { messagesApi, usersApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function EmptyThread() {
  return <div className="m-auto max-w-sm text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-paper"><Send size={42} strokeWidth={1.4} /></div><h2 className="mt-4 text-xl font-light">Your messages</h2><p className="mt-2 text-sm text-slate-faint">Select a conversation or visit a profile to send a message.</p></div>;
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const [conversations, setConversations] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activeUserId, setActiveUserId] = useState(searchParams.get('user'));
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [ownNote, setOwnNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    const { data } = await messagesApi.getConversations();
    setConversations(data.conversations || []);
    setFollowing(data.following || []);
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setSavingNote(true);
    try {
      await usersApi.updateNote({ text: noteText });
      setOwnNote(noteText.trim());
      setNoteText('');
      setNoteEditorOpen(false);
      dispatch(pushToast('Your note will disappear after 24 hours.', 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not save note.', 'error'));
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    const resizeListener = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', resizeListener);
    loadConversations().catch(() => dispatch(pushToast('Could not load messages.', 'error'))).finally(() => setLoading(false));
    return () => window.removeEventListener('resize', resizeListener);
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    setThreadError('');
    messagesApi.getConversation(activeUserId)
      .then(({ data }) => { setParticipant(data.participant); setMessages(data.messages || []); loadConversations().catch(() => {}); })
      .catch((err) => { const error = err.response?.data?.message || 'Could not open this conversation.'; setParticipant(null); setMessages([]); setThreadError(error); dispatch(pushToast(error, 'error')); });
  }, [activeUserId]);

  useEffect(() => {
    // Do not return scrollIntoView's browser-specific result: React reserves
    // an effect return value exclusively for a cleanup function.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && !mediaFile) || !activeUserId) return;
    setDraft('');
    try {
      const payload = new FormData();
      if (text) payload.append('text', text);
      if (mediaFile) payload.append('media', mediaFile);
      const { data } = await messagesApi.sendMessage(activeUserId, payload);
      setMessages((items) => [...items, data.message]);
      setMediaFile(null);
      await loadConversations();
    } catch (err) {
      setDraft(text);
      dispatch(pushToast(err.response?.data?.message || 'Message could not be sent.', 'error'));
    }
  };

  const activeName = participant?.displayName || participant?.username || 'Conversation';
  let body = <EmptyThread />;
  if (activeUserId && threadError) body = <div className="m-auto max-w-sm px-6 text-center"><p className="font-semibold">Conversation unavailable</p><p className="mt-2 text-sm text-slate-faint">{threadError}</p></div>;
  if (activeUserId && !threadError && !participant) body = <p className="m-auto text-sm text-slate-faint">Opening conversation…</p>;
  if (participant) body = <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ink">
    <header className="z-10 flex-shrink-0 items-center border-b border-ink-line bg-ink px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              type="button"
              onClick={() => setActiveUserId(null)}
              className="text-slate-faint hover:text-paper"
              aria-label="Back to conversations"
            >
              ←
            </button>
          )}
          <Avatar src={participant.profilePicture?.url} alt={participant.username} size="sm" online={participant.isOnline} />
          <div>
            <p className="text-sm font-semibold tracking-tight">{activeName}</p>
            <p className="text-[11px] text-slate-faint">{participant.isOnline ? 'Active now' : 'Direct message'}</p>
          </div>
        </div>
        <Info size={22} className="text-slate-faint" />
      </div>
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
      <div className="space-y-3">
        {messages.map((message) => {
          const own = String(message.sender) === String(currentUser?.id || currentUser?._id);
          return (
            <div key={message._id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-[22px] px-4 py-3 text-sm leading-5 shadow-sm ${own ? 'bg-coral text-ink' : 'bg-[#202020] text-paper'}`}>
                {message.media?.url && (message.media.type === 'video' ? (
                  <video src={message.media.url} controls className="mb-2 max-h-72 w-full rounded-xl" />
                ) : (
                  <img src={message.media.url} alt="Message attachment" className="mb-2 h-auto max-h-72 w-full rounded-xl object-cover" />
                ))}
                {message.text && <p className="break-words">{message.text}</p>}
                <p className={`mt-2 text-[10px] ${own ? 'text-ink/65' : 'text-slate-faint'}`}>{formatTime(message.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
    <div className="z-10 flex-shrink-0 border-t border-ink-line bg-ink px-4 py-3 sm:px-5">
      <form onSubmit={handleSend} className="flex items-center gap-2 rounded-full border border-ink-line bg-[#161616] px-3 py-2 shadow-inner sm:px-4">
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ink-soft text-slate-faint transition hover:text-paper">
          <Image size={18} />
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
          />
        </label>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-slate-faint"
          placeholder="Message..."
        />
        <button
          type="submit"
          disabled={!draft.trim() && !mediaFile}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-coral text-ink transition disabled:cursor-not-allowed disabled:bg-slate-mute disabled:text-slate-faint"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
      {mediaFile && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-soft px-3 py-2 text-xs text-slate-faint">
          <span className="truncate">{mediaFile.name}</span>
          <button type="button" onClick={() => setMediaFile(null)} className="text-coral" aria-label="Remove attachment"><X size={16} /></button>
        </div>
      )}
    </div>
  </div>;

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] overflow-hidden bg-ink text-paper md:static md:h-screen md:p-5">
      <div className="mx-auto flex h-full max-w-6xl overflow-hidden bg-ink-soft md:min-h-[calc(100vh-40px)] md:rounded-2xl md:border md:border-ink-line">
        <aside className={`h-full w-full shrink-0 flex-col overflow-hidden border-r border-ink-line sm:w-[350px] ${activeUserId && isMobile ? 'hidden' : 'flex'}`}>
          <header className="flex h-[60px] items-center justify-center border-b border-ink-line px-5">
            <h1 className="font-display text-xl">Messages</h1>
          </header>
          <div className="border-b border-ink-line px-3 py-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button type="button" onClick={() => setNoteEditorOpen((open) => !open)} className="w-16 shrink-0 text-center">
                <div className="relative mx-auto w-fit"><Avatar src={currentUser?.profilePicture?.url} alt={currentUser?.username} size="md" /><span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-coral text-ink"><Plus size={13} /></span></div>
                <span className="mt-1 block truncate text-[11px] text-slate-faint">{ownNote || 'Your note'}</span>
              </button>
              {following.map((user) => (
                <button key={user.id} type="button" onClick={() => setActiveUserId(user.id)} className="relative w-20 shrink-0 text-center">
                  <div className="relative mx-auto mb-1 h-[52px] w-[52px]">
                    {user.note && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full max-w-[5rem] rounded-2xl bg-paper px-2 py-1 text-[10px] leading-4 text-ink shadow-sm">
                        {user.note}
                      </div>
                    )}
                    <Avatar src={user.profilePicture?.url} alt={user.username} size="md" online={user.isOnline} />
                  </div>
                  <span className="block truncate text-[11px] text-slate-faint">{user.username}</span>
                </button>
              ))}
            </div>
            {noteEditorOpen && (
              <form onSubmit={saveNote} className="mt-3 flex gap-2">
                <input value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={60} placeholder="Share a short note…" className="min-w-0 flex-1 rounded-xl border border-ink-line bg-ink px-3 py-2 text-sm outline-none focus:border-teal-bright" autoFocus />
                <button type="submit" disabled={savingNote || !noteText.trim()} className="rounded-xl bg-coral px-3 text-sm font-semibold text-ink disabled:opacity-50">{savingNote ? '…' : 'Post'}</button>
              </form>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <p className="p-5 text-sm text-slate-faint">Loading messages…</p>
          ) : conversations.length === 0 ? (
            <div className="px-7 py-12 text-center">
              <p className="font-semibold">No messages yet</p>
              <p className="mt-1 text-sm text-slate-faint">Visit a profile to start a conversation.</p>
            </div>
          ) : (
            <div className="space-y-4 px-2 py-2 sm:px-0">
              {conversations.filter((conversation) => conversation.status === 'request').length > 0 && (
                <div>
                  <div className="mb-2 px-4 text-xs uppercase tracking-[0.2em] text-slate-faint">Message Requests</div>
                  <div className="space-y-1">
                    {conversations.filter((conversation) => conversation.status === 'request').map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveUserId(conversation.id)}
                        className={`group flex w-full items-center gap-3 rounded-3xl border border-ink-line px-4 py-3 text-left transition ${activeUserId === conversation.id ? 'bg-ink' : 'hover:bg-ink'}`}
                      >
                        <Avatar
                          src={conversation.participant?.profilePicture?.url}
                          alt={conversation.participant?.username}
                          size="md"
                          online={conversation.participant?.isOnline}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-paper">{conversation.participant?.displayName || conversation.participant?.username}</p>
                            {conversation.unread > 0 && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-coral" />}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-faint">{conversation.preview}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 px-4 text-xs uppercase tracking-[0.2em] text-slate-faint">Inbox</div>
                <div className="space-y-1">
                  {conversations.filter((conversation) => conversation.status !== 'request').map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveUserId(conversation.id)}
                      className={`group flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left transition ${activeUserId === conversation.id ? 'bg-ink' : 'hover:bg-ink'}`}
                    >
                      <Avatar
                        src={conversation.participant?.profilePicture?.url}
                        alt={conversation.participant?.username}
                        size="md"
                        online={conversation.participant?.isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-paper">{conversation.participant?.displayName || conversation.participant?.username}</p>
                          {conversation.unread > 0 && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-coral" />}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-faint">{conversation.preview}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          )}
          </div>
        </aside>
        <section className={`min-w-0 min-h-0 h-full flex flex-1 flex-col overflow-hidden ${activeUserId ? 'flex' : 'hidden sm:flex'}`}>{body}</section>
      </div>
    </div>
  );
}
