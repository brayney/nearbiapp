import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, File, Image, Info, Link2, Mic, MoreVertical, Plus, Send, ShieldAlert, Square, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { messagesApi, usersApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';
import { fetchMe } from '../features/auth/authSlice';
import { formatPresence, formatPresenceBadge } from '../utils/presence';

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
  const [connection, setConnection] = useState({});
  const [nickname, setNickname] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [mailboxView, setMailboxView] = useState('requests');
  const [savingConnection, setSavingConnection] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceLevels, setVoiceLevels] = useState(Array(22).fill(0.14));
  const bottomRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sendVoiceWhenReadyRef = useRef(false);

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
      await dispatch(fetchMe());
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
    if (currentUser?.note) {
      setOwnNote(currentUser.note);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!activeUserId) return;
    setThreadError('');
    messagesApi.getConversation(activeUserId)
      .then(({ data }) => { setParticipant(data.participant); setMessages(data.messages || []); setConnection(data.connection || {}); setNickname(data.connection?.nickname || ''); loadConversations().catch(() => {}); })
      .catch((err) => { const error = err.response?.data?.message || 'Could not open this conversation.'; setParticipant(null); setMessages([]); setThreadError(error); dispatch(pushToast(error, 'error')); });
  }, [activeUserId]);

  useEffect(() => {
    // Do not return scrollIntoView's browser-specific result: React reserves
    // an effect return value exclusively for a cleanup function.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const releaseVoiceResources = (stopTracks = true) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    if (stopTracks) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    releaseVoiceResources();
  }, []);

  const sendMessage = async (text, file) => {
    if ((!text && !file) || !activeUserId) return;
    try {
      const payload = new FormData();
      if (text) payload.append('text', text);
      if (file) payload.append('media', file);
      const { data } = await messagesApi.sendMessage(activeUserId, payload);
      setMessages((items) => [...items, data.message]);
      setMediaFile(null);
      await loadConversations();
    } catch (err) {
      setDraft(text);
      dispatch(pushToast(err.response?.data?.message || 'Message could not be sent.', 'error'));
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (recordingVoice) {
      // Stop recording first, then upload as soon as MediaRecorder produces the final audio blob.
      sendVoiceWhenReadyRef.current = true;
      await stopVoiceRecording();
      return;
    }
    const text = draft.trim();
    if ((!text && !mediaFile) || !activeUserId) return;
    setDraft('');
    sendMessage(text, mediaFile);
  };

  const finalizeVoiceRecording = async () => {
    const currentRecorder = recorderRef.current;
    const type = currentRecorder?.mimeType || 'audio/webm';
    const extension = type.includes('mp4') ? 'm4a' : type.includes('webm') ? 'webm' : 'ogg';
    const recording = new File([new Blob(audioChunksRef.current, { type })], `voice-message-${Date.now()}.${extension}`, { type });

    recorderRef.current = null;
    setRecordingVoice(false);
    setVoiceLevels(Array(22).fill(0.14));

    if (recording.size > 0) {
      setMediaFile(recording);
      if (sendVoiceWhenReadyRef.current) {
        sendVoiceWhenReadyRef.current = false;
        await sendMessage('', recording);
      }
    } else if (sendVoiceWhenReadyRef.current) {
      sendVoiceWhenReadyRef.current = false;
      dispatch(pushToast('No audio was recorded. Please try again.', 'error'));
    }

    releaseVoiceResources();
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      dispatch(pushToast('Voice recording is not supported by this browser.', 'error'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, noiseSuppression: true, echoCancellation: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = audioContext;
        audioContext.resume?.().catch(() => {});
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const drawLevels = () => {
          analyser.getByteFrequencyData(frequencyData);
          const levels = Array.from({ length: 22 }, (_, index) => {
            const sample = frequencyData[Math.floor((index / 22) * frequencyData.length)] || 0;
            return Math.max(0.14, sample / 255);
          });
          setVoiceLevels(levels);
          animationFrameRef.current = requestAnimationFrame(drawLevels);
        };
        drawLevels();
      }
      audioChunksRef.current = [];
      recordingStreamRef.current = stream;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        finalizeVoiceRecording();
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecordingVoice(true);
    } catch (err) {
      dispatch(pushToast(err.name === 'NotAllowedError' ? 'Allow microphone access to record a voice message.' : 'Could not start voice recording.', 'error'));
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      try {
        recorder.requestData();
      } catch (err) {
        // Some browsers do not expose requestData; continue with stop.
      }
      recorder.stop();
      return;
    }

    setRecordingVoice(false);
    setVoiceLevels(Array(22).fill(0.14));
    await finalizeVoiceRecording();
  };

  const updateConnection = async (payload, successMessage) => {
    if (!activeUserId) return;
    setSavingConnection(true);
    try {
      const { data } = await messagesApi.updateSettings(activeUserId, payload);
      setConnection(data.connection || {});
      setNickname(data.connection?.nickname || '');
      await loadConversations();
      if (successMessage) dispatch(pushToast(successMessage, 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not update conversation settings.', 'error'));
    } finally {
      setSavingConnection(false);
    }
  };

  const reportConversation = async () => {
    if (!activeUserId) return;
    setSavingConnection(true);
    try {
      await messagesApi.reportConversation(activeUserId);
      setConnection((current) => ({ ...current, spam: true }));
      setDetailsOpen(false);
      await loadConversations();
      dispatch(pushToast('Conversation reported and moved to spam.', 'success'));
    } catch (err) {
      dispatch(pushToast(err.response?.data?.message || 'Could not report this conversation.', 'error'));
    } finally {
      setSavingConnection(false);
    }
  };

  const activeName = connection.nickname || participant?.displayName || participant?.username || 'Conversation';
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
            <p className="text-[11px] text-slate-faint">{formatPresence(participant)}</p>
          </div>
        </div>
        <button type="button" onClick={() => setDetailsOpen(true)} className="rounded-full p-2 text-slate-faint transition hover:bg-ink-soft hover:text-paper" aria-label="Conversation details">
          <Info size={22} />
        </button>
      </div>
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
      <div className="space-y-3">
        {messages.map((message) => {
          const own = String(message.sender) === String(currentUser?.id || currentUser?._id);
          const isExpanded = expandedMessageId === message._id;
          const sender = own ? currentUser : participant;
          return (
            <div key={message._id} className={`flex items-end gap-2 ${own ? 'justify-end' : 'justify-start'}`}>
              {!own && <Avatar src={sender?.profilePicture?.url} alt={sender?.username} size="xs" />}
              <div className="max-w-[80%]">
              <div onClick={() => setExpandedMessageId((current) => current === message._id ? null : message._id)} className={`cursor-pointer rounded-[22px] px-4 py-3 text-sm leading-5 shadow-sm ${own ? 'bg-coral text-ink' : 'bg-[#202020] text-paper'}`}>
                {message.media?.url && (message.media.type === 'video' ? (
                  <video src={message.media.url} controls className="mb-2 max-h-72 w-full rounded-xl" />
                ) : message.media.type === 'audio' ? (
                  <audio src={message.media.url} controls className="mb-1 w-full min-w-[13rem]" aria-label="Voice message" />
                ) : message.media.type === 'file' ? (
                  <a href={message.media.url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2 font-medium underline"><File size={16} />Open attachment</a>
                ) : (
                  <img src={message.media.url} alt="Message attachment" className="mb-2 h-auto max-h-72 w-full rounded-xl object-cover" />
                ))}
                {message.text && <p className="break-words">{message.text}</p>}
              </div>
              {isExpanded && <p className={`mt-1 px-2 text-[10px] ${own ? 'text-right text-slate-faint' : 'text-slate-faint'}`}>{formatTime(message.createdAt)}</p>}
              </div>
              {own && <Avatar src={sender?.profilePicture?.url} alt={sender?.username} size="xs" />}
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
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
            onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
          />
        </label>
        {recordingVoice ? (
          <div className="flex min-w-0 flex-1 items-center gap-2" aria-label="Recording voice message">
            <span className="shrink-0 text-xs font-semibold text-coral">Recording</span>
            <div className="flex h-8 flex-1 items-center justify-center gap-0.5 overflow-hidden">
              {voiceLevels.map((level, index) => <span key={index} className="w-1 rounded-full bg-coral transition-[height] duration-75" style={{ height: `${Math.round(5 + level * 24)}px` }} />)}
            </div>
          </div>
        ) : (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-slate-faint"
            placeholder="Message..."
          />
        )}
        <button
          type="button"
          onClick={recordingVoice ? stopVoiceRecording : startVoiceRecording}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${recordingVoice ? 'bg-coral text-ink animate-pulse' : 'bg-ink-soft text-slate-faint hover:text-paper'}`}
          aria-label={recordingVoice ? 'Stop voice recording' : 'Record voice message'}
        >
          {recordingVoice ? <Square size={15} fill="currentColor" /> : <Mic size={18} />}
        </button>
        <button
          type="submit"
          disabled={!recordingVoice && !draft.trim() && !mediaFile}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-coral text-ink transition disabled:cursor-not-allowed disabled:bg-slate-mute disabled:text-slate-faint"
          aria-label={recordingVoice ? 'Stop and send voice message' : 'Send message'}
        >
          <Send size={16} />
        </button>
      </form>
      {mediaFile && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-soft px-3 py-2 text-xs text-slate-faint">
          <span className="truncate">{mediaFile.type.startsWith('audio/') ? 'Voice message ready to send' : mediaFile.name}</span>
          <button type="button" onClick={() => setMediaFile(null)} className="text-coral" aria-label="Remove attachment"><X size={16} /></button>
        </div>
      )}
    </div>
  </div>;

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] overflow-hidden bg-ink text-paper md:static md:h-screen md:p-5">
      <div className="mx-auto flex h-full max-w-6xl overflow-visible bg-ink-soft md:min-h-[calc(100vh-40px)] md:rounded-2xl md:border md:border-ink-line">
        <aside className={`h-full w-full shrink-0 flex-col overflow-visible border-r border-ink-line sm:w-[350px] ${activeUserId && isMobile ? 'hidden' : 'flex'}`}>
          <header className="flex h-[60px] items-center justify-between border-b border-ink-line px-5">
            <h1 className="font-display text-xl">Messages</h1>
            <button type="button" onClick={() => setMailboxOpen(true)} className="rounded-full p-2 text-slate-faint transition hover:bg-ink hover:text-paper" aria-label="Message folders">
              <MoreVertical size={21} />
            </button>
          </header>
          <div className="border-b border-ink-line px-3 py-3">
            <div className="flex gap-3 overflow-x-auto px-1 pb-1">
              <button type="button" onClick={() => setNoteEditorOpen((open) => !open)} className="relative w-20 shrink-0 overflow-visible text-center">
                <div className="mb-1 flex h-7 items-end justify-center">
                  {ownNote && <span className="max-w-[9rem] truncate rounded-full bg-paper px-3 py-1.5 text-[10px] font-semibold text-ink shadow-lg">{ownNote}</span>}
                </div>
                <div className="relative mx-auto h-[56px] w-[56px]">
                  <Avatar src={currentUser?.profilePicture?.url} alt={currentUser?.username} size="md" />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-coral text-ink">
                    <Plus size={13} />
                  </span>
                </div>
                <span className="block truncate text-[11px] text-slate-faint">{ownNote ? 'Your note' : 'Your note'}</span>
              </button>
              {following.map((user) => (
                <button key={user.id} type="button" onClick={() => setActiveUserId(user.id)} className="relative w-20 shrink-0 overflow-visible text-center">
                  <div className="mb-1 flex h-7 items-end justify-center">
                    {user.note && <span className="max-w-[9rem] truncate rounded-full bg-paper px-3 py-1.5 text-[10px] font-semibold text-ink shadow-lg">{user.note}</span>}
                  </div>
                  <div className="relative mx-auto h-[56px] w-[56px]">
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
              <div>
                <div className="mb-2 px-4 text-xs uppercase tracking-[0.2em] text-slate-faint">Inbox</div>
                <div className="space-y-1">
                  {conversations.filter((conversation) => conversation.status === 'inbox' && !conversation.blocked).map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveUserId(conversation.id)}
                      className={`group flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left transition ${activeUserId === conversation.id ? 'bg-ink' : 'hover:bg-ink'}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={conversation.participant?.profilePicture?.url}
                          alt={conversation.participant?.username}
                          size="md"
                          online={conversation.participant?.isOnline}
                        />
                        {!conversation.participant?.isOnline && formatPresenceBadge(conversation.participant) && (
                          <span title={formatPresence(conversation.participant)} className="absolute -bottom-1 -right-2 rounded-full border-2 border-ink bg-ink-soft px-1 py-0.5 text-[9px] font-semibold leading-none text-slate-faint">
                            {formatPresenceBadge(conversation.participant)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-paper">{conversation.nickname || conversation.participant?.displayName || conversation.participant?.username}</p>
                          {conversation.unread > 0 && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-coral" />}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-faint">{conversation.preview || 'Start a conversation'}</p>
                      </div>
                    </button>
                  ))}
                  {conversations.filter((conversation) => conversation.status === 'inbox' && !conversation.blocked).length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-faint">No inbox conversations yet.</p>}
                </div>
              </div>
            </div>

          )}
          </div>
        </aside>
        <section className={`min-w-0 min-h-0 h-full flex flex-1 flex-col overflow-hidden ${activeUserId ? 'flex' : 'hidden sm:flex'}`}>{body}</section>
      </div>

      {detailsOpen && participant && (
        <div className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] z-[70] flex justify-end bg-black/60 md:bottom-0" role="dialog" aria-modal="true" aria-label="Conversation details" onMouseDown={() => setDetailsOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ink-line bg-ink p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl md:pb-5" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-display text-xl">Conversation details</h2><button type="button" onClick={() => setDetailsOpen(false)} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft" aria-label="Close"><X size={20} /></button></div>
            <div className="mt-6 flex flex-col items-center text-center"><Avatar src={participant.profilePicture?.url} alt={participant.username} size="xl" online={participant.isOnline} /><p className="mt-3 font-semibold">{connection.nickname || activeName}</p><p className="text-sm text-slate-faint">@{participant.username}</p><p className="mt-1 text-xs text-slate-faint">{formatPresence(participant)}</p></div>
            <form className="mt-7" onSubmit={(event) => { event.preventDefault(); updateConnection({ nickname }, 'Nickname saved.'); }}>
              <label className="block text-sm font-semibold">Nickname<input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={50} placeholder="Set a nickname" className="mt-2 w-full rounded-xl border border-ink-line bg-ink-soft px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-bright" /></label>
              <button type="submit" disabled={savingConnection} className="mt-2 rounded-xl bg-ink-soft px-4 py-2 text-sm font-semibold hover:bg-ink-line disabled:opacity-50">Save nickname</button>
            </form>
            <DetailSection icon={<Image size={17} />} title="Media" items={messages.filter((message) => message.media?.url)} renderItem={(message) => <a href={message.media.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-ink-soft"><img src={message.media.url} alt="Shared media" className="h-24 w-full object-cover" /></a>} empty="No shared media yet." />
            <DetailSection icon={<File size={17} />} title="Files" items={messages.filter((message) => message.media?.type === 'file')} renderItem={(message) => <a href={message.media.url} target="_blank" rel="noreferrer" className="col-span-3 flex items-center gap-2 rounded-xl bg-ink-soft px-3 py-2 text-sm text-coral hover:underline"><File size={16} />Open shared file</a>} empty="No shared files yet." />
            <DetailSection icon={<Link2 size={17} />} title="Links" items={messages.flatMap((message) => (message.text?.match(/https?:\/\/[^\s]+/g) || []).map((url) => ({ url, id: `${message._id}-${url}` })))} renderItem={(link) => <a href={link.url} target="_blank" rel="noreferrer" className="block truncate rounded-xl bg-ink-soft px-3 py-2 text-sm text-coral hover:underline">{link.url}</a>} empty="No shared links yet." />
            <div className="mt-7 border-t border-ink-line pt-5 space-y-2">
              <button type="button" disabled={savingConnection} onClick={() => updateConnection({ blocked: !connection.blocked }, connection.blocked ? 'User unblocked.' : 'User blocked.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-coral hover:bg-ink-soft disabled:opacity-50"><Ban size={18} />{connection.blocked ? 'Unblock user' : 'Block user'}</button>
              <button type="button" disabled={savingConnection} onClick={reportConversation} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-coral hover:bg-ink-soft disabled:opacity-50"><ShieldAlert size={18} />Report conversation</button>
            </div>
          </aside>
        </div>
      )}

      {mailboxOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Message folders" onMouseDown={() => setMailboxOpen(false)}>
          <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-hidden rounded-2xl border border-ink-line bg-ink shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-line px-5 py-4"><h2 className="font-display text-xl">Message folders</h2><button type="button" onClick={() => setMailboxOpen(false)} className="rounded-full p-2 text-slate-faint hover:bg-ink-soft" aria-label="Close"><X size={18} /></button></div>
            <div className="flex border-b border-ink-line"><FolderTab active={mailboxView === 'requests'} onClick={() => setMailboxView('requests')}>Requests</FolderTab><FolderTab active={mailboxView === 'spam'} onClick={() => setMailboxView('spam')}>Spam</FolderTab><FolderTab active={mailboxView === 'blocked'} onClick={() => setMailboxView('blocked')}>Blocked</FolderTab></div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {conversations.filter((conversation) => mailboxView === 'blocked' ? conversation.blocked : conversation.status === (mailboxView === 'requests' ? 'request' : 'spam')).length === 0 ? <p className="py-10 text-center text-sm text-slate-faint">No {mailboxView} conversations.</p> : conversations.filter((conversation) => mailboxView === 'blocked' ? conversation.blocked : conversation.status === (mailboxView === 'requests' ? 'request' : 'spam')).map((conversation) => <button key={conversation.id} type="button" onClick={() => { setMailboxOpen(false); setActiveUserId(conversation.id); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-ink-soft"><Avatar src={conversation.participant?.profilePicture?.url} alt={conversation.participant?.username} size="md" online={conversation.participant?.isOnline} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{conversation.nickname || conversation.participant?.displayName || conversation.participant?.username}</p><p className="truncate text-xs text-slate-faint">{formatPresence(conversation.participant)}{conversation.preview ? ` · ${conversation.preview}` : ''}</p></div></button>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DetailSection({ icon, title, items, renderItem, empty }) {
  return <section className="mt-7"><h3 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3><div className="mt-3 grid grid-cols-3 gap-2">{items.length ? items.map((item) => <React.Fragment key={item._id || item.id}>{renderItem(item)}</React.Fragment>) : <p className="col-span-3 text-sm text-slate-faint">{empty}</p>}</div></section>;
}

function FolderTab({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`flex-1 px-3 py-3 text-sm font-semibold ${active ? 'border-b-2 border-coral text-paper' : 'text-slate-faint'}`}>{children}</button>;
}
