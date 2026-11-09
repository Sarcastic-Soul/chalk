/** Time helpers that work in the shop's timezone, not the server's. */

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** "YYYY-MM-DD" for the given instant in the given timezone. */
export function localDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Minutes the timezone is ahead of UTC at the given instant. */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The UTC instant for a wall-clock date + "HH:MM" in the given timezone. */
export function zonedTime(dateStr: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle DST edges where the offset changes near the target time.
  let result = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  result = guess - offsetMinutes(new Date(result), timeZone) * 60000;
  return new Date(result);
}

/** Adds whole days to a "YYYY-MM-DD" string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a "YYYY-MM-DD" string. */
export function weekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Short human label like "Wed 12 Nov, 9:00 am" in the shop's timezone. */
export function formatWhen(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Clamp "HH:MM" into [open, close]; both "HH:MM". */
export function clampTime(time: string, open: string, close: string): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const v = Math.min(Math.max(toMin(time), toMin(open)), toMin(close));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}
