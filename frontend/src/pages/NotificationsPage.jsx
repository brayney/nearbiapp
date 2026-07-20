import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { notificationsApi } from '../api/resources';
import { pushToast } from '../features/ui/uiSlice';
import { useDispatch } from 'react-redux';

const ALLOWED_NOTIFICATION_TYPES = new Set(['follow', 'like', 'comment', 'reply', 'share', 'post']);

export default function NotificationsPage() {
  const dispatch = useDispatch(); const [notifications, setNotifications] = useState([]); const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await notificationsApi.getNotifications();
    const visibleNotifications = (data.notifications || []).filter((item) => ALLOWED_NOTIFICATION_TYPES.has(item.type));
    setNotifications(visibleNotifications);
  };
  useEffect(() => { load().catch(() => dispatch(pushToast('Could not load notifications.', 'error'))).finally(() => setLoading(false)); }, []);
  const markAllRead = async () => { try { await notificationsApi.markAllRead(); setNotifications((items) => items.map((item) => ({ ...item, read: true }))); } catch { dispatch(pushToast('Could not mark notifications as read.', 'error')); } };
  return <div className="min-h-screen bg-ink px-4 py-6 text-paper md:px-8"><div className="mx-auto max-w-2xl"><header className="sticky top-0 z-10 -mx-4 mb-5 flex items-center justify-between border-b border-ink-line bg-ink/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0"><h1 className="font-display text-xl">Notifications</h1>{notifications.some((item) => !item.read) && <button onClick={markAllRead} className="text-sm font-semibold text-coral">Mark all as read</button>}</header>{loading ? <p className="text-sm text-slate-faint">Loading notifications…</p> : notifications.length === 0 ? <p className="py-12 text-center text-sm text-slate-faint">You’re all caught up.</p> : <div className="overflow-hidden rounded-2xl border border-ink-line bg-ink-soft">{notifications.map((notification) => { const actor = notification.actor; const text = notification.message?.startsWith(`${actor?.username} `) ? notification.message.slice(actor.username.length + 1) : notification.message || 'interacted with you.'; const content = <div className={`flex items-center gap-3 px-4 py-3 ${notification.read ? '' : 'bg-ink/50'} hover:bg-ink`}><Avatar src={actor?.profilePicture?.url} alt={actor?.username} size="md" /><p className="flex-1 text-sm"><span className="font-semibold">{actor?.displayName || actor?.username || 'Someone'}</span>{' '}{text}</p>{!notification.read && <span className="h-2 w-2 rounded-full bg-coral" />}</div>; return notification.actor?.username ? <Link key={notification._id} to={`/profile/${notification.actor.username}`}>{content}</Link> : <div key={notification._id}>{content}</div>; })}</div>}</div></div>;
}
