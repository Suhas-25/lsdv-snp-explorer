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
