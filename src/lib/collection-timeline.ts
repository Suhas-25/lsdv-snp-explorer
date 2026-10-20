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