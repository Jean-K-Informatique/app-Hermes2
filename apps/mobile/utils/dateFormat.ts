/**
 * Format a date as a relative time string (e.g., "il y a 5 min", "Hier").
 */
export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay === 1) return 'Hier';
  if (diffDay < 7) return `Il y a ${diffDay}j`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format a date as a time string (e.g., "14:30").
 */
export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if two dates are on the same day.
 */
export function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
