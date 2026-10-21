import type { Sample } from "@/lib/snp-data";

export function filterCollectionDate<T extends Pick<Sample, "date">>(samples: T[], date: string | null): T[] {
  return date === null ? samples : samples.filter((sample) => sample.date === date);
}

export function collectionEvents<T extends Pick<Sample, "date">>(samples: T[]) {
  const grouped = new Map<string, T[]>();
  for (const sample of samples) {
    const group = grouped.get(sample.date) ?? [];
    group.push(sample);
    grouped.set(sample.date, group);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function collectionTimeScale(dates: string[]) {
  const times = dates.map((date) => Date.parse(`${date}T00:00:00Z`));
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const start = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 2, 1);
  const months: string[] = [];
  for (let month = new Date(start); month.getTime() < end; month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))) {
    months.push(month.toISOString().slice(0, 10));
  }
  const positionTime = (time: number) => (time - start) / (end - start) * 100;
  return { months, positionTime, position: (date: string) => positionTime(Date.parse(`${date}T00:00:00Z`)) };
}

export const DATE_HOLD_MS = 1800;
export const DATE_TRAVEL_MS = 1000;

export function collectionPlayback(dates: string[], elapsed: number) {
  if (!dates.length) return null;
  const segment = DATE_HOLD_MS + DATE_TRAVEL_MS;
  const index = Math.min(Math.floor(Math.max(0, elapsed) / segment), dates.length - 1);
  const date = dates[index];
  if (!date) return null;
  const next = dates[index + 1];
  const local = Math.max(0, elapsed) - index * segment;
  const fraction = next ? Math.min(1, Math.max(0, (local - DATE_HOLD_MS) / DATE_TRAVEL_MS)) : 0;
  const time = Date.parse(`${date}T00:00:00Z`);
  return {
    date,
    time: next ? time + (Date.parse(`${next}T00:00:00Z`) - time) * fraction : time,
    dwelling: local < DATE_HOLD_MS,
    complete: elapsed >= (dates.length - 1) * segment + DATE_HOLD_MS,
  };
}