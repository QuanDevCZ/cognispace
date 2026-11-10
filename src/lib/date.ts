// All dates are local-time day keys: 'YYYY-MM-DD'.

export const keyOf = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayKey = (): string => keyOf(new Date());

export const parseKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number): string => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};

export const diffDays = (a: string, b: string): number =>
  Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86400000);

/** Monday of the week containing `key`. */
export const weekStart = (key: string): string => {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
};

export const lastNDays = (n: number, end = todayKey()): string[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayShort = (key: string) => WD[parseKey(key).getDay()];
export const monthShort = (key: string) => MO[parseKey(key).getMonth()];
export const dayNum = (key: string) => parseKey(key).getDate();
export const fmtShort = (key: string) => `${dayNum(key)} ${monthShort(key)}`;
export const fmtLong = (key: string) =>
  parseKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export const relativeDay = (key: string): string => {
  const d = diffDays(key, todayKey());
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < -1) return `${-d}d overdue`;
  if (d < 7) return weekdayShort(key);
  return fmtShort(key);
};

export const fmtMinutes = (min: number): string => {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

export const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};
