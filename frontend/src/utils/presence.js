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
