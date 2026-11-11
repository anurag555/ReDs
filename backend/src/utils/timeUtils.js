/**
 * Time utility functions for formatting and parsing seconds into readable timestamps.
 */

export function formatSeconds(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function parseTimestamp(str) {
  if (!str) return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(str) || 0;
}

