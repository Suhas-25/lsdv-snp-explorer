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
  return { months, position: (date: string) => (Date.parse(`${date}T00:00:00Z`) - start) / (end - start) * 100 };
}