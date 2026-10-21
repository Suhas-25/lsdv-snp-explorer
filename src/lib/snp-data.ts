import metaRaw from "@/data/samples_metadata.csv?raw";
import snpRaw from "@/data/snp_list.csv?raw";
import statusRaw from "@/data/sample_snp_status.csv?raw";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(raw: string): any[] {
  const lines = raw.trim().split(/\r?\n/);
  const head = (lines[0] ?? "").split(",").map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? "").trim()]));
  });
}

export type Sample = {
  id: string; genbank: string; state: string; district: string;
  date: string; type: string; location: string;
};
export type Snp = { key: string; position: number; ref: string; alt: string; label: string };

export const samples: Sample[] = parse(metaRaw).map((r) => ({
  id: r.Sample_ID, genbank: r.GenBank_ID, state: r.State, district: r.District,
  date: r.Collection_Date, type: r.Sample_Type, location: r.Location,
}));

export const snps: Snp[] = parse(snpRaw).map((r) => ({
  key: `${r.Position}-${r.REF}-${r.ALT}`, position: Number(r.Position), ref: r.REF, alt: r.ALT,
  label: `${r.Position} ${r.REF}→${r.ALT}`,
}));

const status = parse(statusRaw);

export function samplesWithSnp(snp: Snp) {
  const hits = new Map<string, string>();
  for (const s of status) {
    if (`${s.Position}-${s.REF}-${s.ALT}` === snp.key && s.Status.toLowerCase() === "present")
      hits.set(s.Sample_ID, s.Status);
  }
  return samples.filter((s) => hits.has(s.id)).map((s) => ({ ...s, status: hits.get(s.id)! }));
}

// Approximate district centroids [lon, lat]
export const districtCoords: Record<string, [number, number]> = {
  Ahmednagar: [74.74, 19.09], Pune: [73.86, 18.52], Angul: [85.1, 20.84], Mayurbhanj: [86.73, 21.93],
};

// Each district gets its own shade of its state's colour (darker → lighter, alphabetical),
// so districts stay distinguishable while still reading as the same state.
const stateColor: Record<string, string> = { Maharashtra: "var(--mh)", Odisha: "var(--od)" };
export const stateDistricts: Record<string, string[]> = {};
for (const s of samples) {
  const list = (stateDistricts[s.state] ??= []);
  if (!list.includes(s.district)) list.push(s.district);
}
Object.values(stateDistricts).forEach((list) => list.sort());

export function districtTone(state: string, district: string) {
  const base = stateColor[state] ?? "var(--primary)";
  const list = stateDistricts[state] ?? [];
  if (list.length < 2) return base;
  const t = list.indexOf(district) / (list.length - 1); // 0 = darkest, 1 = lightest
  return t < 0.5
    ? `color-mix(in oklch, ${base}, black ${Math.round((0.5 - t) * 50)}%)`
    : `color-mix(in oklch, ${base}, white ${Math.round((t - 0.5) * 60)}%)`;
}
