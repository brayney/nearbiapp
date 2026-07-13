export function formatPresence(user) {
  if (user?.isOnline) return 'Active now';

  const lastActive = user?.lastActive ? new Date(user.lastActive) : null;
  if (!lastActive || Number.isNaN(lastActive.getTime())) return 'Offline';

  const now = new Date();
  const sameDay = lastActive.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(lastActive);

  if (sameDay) return `Last active today at ${time}`;
  if (lastActive.toDateString() === yesterday.toDateString()) return `Last active yesterday at ${time}`;
  return `Last active ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: lastActive.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).format(lastActive)} at ${time}`;
}

export function formatPresenceBadge(user) {
  if (user?.isOnline) return '';
  const lastActive = user?.lastActive ? new Date(user.lastActive) : null;
  if (!lastActive || Number.isNaN(lastActive.getTime())) return '';

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - lastActive.getTime()) / 60000));
  if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)}m`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)}h`;
  return `${Math.floor(elapsedMinutes / (24 * 60))}d`;
}
