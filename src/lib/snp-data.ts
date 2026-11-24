// Data comes from lvl_2_explore/scripts: build_matrix.py → build_explorer_json.py → explorer_data.json.
// Each mutation lists its carriers (GenBank IDs), which is the samples × mutations matrix in compact form.
import data from "@/data/explorer_data.json";

type RawSample = (typeof data.samples)[number];
type RawMutation = (typeof data.mutations)[number];

export type Sample = {
  id: string;            // GenBank ID (without version), the key used everywhere
  sampleId: string;      // lab name, e.g. NCL-BAIF-LSDV063
  state: string;
  stateLgd: number | null;
  district: string;      // name as in the sample sheet (e.g. "Angul")
  districtLgd: string;   // LGD code as text; joins samples to the district shapes on the map
  location: string;
  type: string;
  host: string;
  date: string;          // YYYY-MM-DD, "" when unknown
  totalMutations: number;
  privateMutations: number;
  effects: Record<string, number>;
};

export type Snp = {
  key: string; position: number; ref: string; alt: string; label: string;
  type: string; effectGroup: string; effect: string; impact: string; gene: string; protein: string;
  count: number; freq: number; cls: string; carriers: string[];
};

export const reference = data.meta.reference;
export const effectGroups: string[] = data.meta.effect_groups;

export const samples: Sample[] = data.samples.map((s: RawSample) => ({
  id: s.id, sampleId: s.sample_id, state: s.state, stateLgd: s.state_lgd,
  district: s.district_label || s.district, districtLgd: String(s.district_lgd ?? ""),
  location: s.location, type: s.sample_type, host: s.host, date: s.date ?? "",
  totalMutations: s.total_mutations, privateMutations: s.private_mutations,
  effects: s.effects as Record<string, number>,
}));

export const snps: Snp[] = data.mutations.map((m: RawMutation) => ({
  key: m.key, position: m.pos, ref: m.ref, alt: m.alt,
  label: `${m.pos} ${m.ref}→${m.alt}${m.gene ? ` · ${m.gene}` : ""}`,
  type: m.type, effectGroup: m.effect_group, effect: m.effect, impact: m.impact,
  gene: m.gene, protein: m.protein, count: m.count, freq: m.freq, cls: m.class, carriers: m.carriers,
}));

// Dropdown values meaning "no filter": all effects, all genes, all mutations of the selection.
export const ALL_EFFECTS = "__all_effects__";
export const ALL_GENES = "__all_genes__";
export const ALL_MUTATIONS = "__all__";

// Selection flow: Effect → Gene → Mutation. Core mutations are carried by every sample (lineage
// differences from the reference), so they are hidden by default: they would light up every district.
function inSelection(s: Snp, group: string, includeCore: boolean) {
  return (group === ALL_EFFECTS || s.effectGroup === group) && (includeCore || s.cls !== "core");
}

export function mutationsFor(group: string, includeCore: boolean, gene: string = ALL_GENES) {
  return snps
    .filter((s) => inSelection(s, group, includeCore) && (gene === ALL_GENES || s.gene === gene))
    .sort((a, b) => b.count - a.count || a.position - b.position);
}

// Genes that have at least one mutation of the chosen effect, in genome order, with how many.
export function genesFor(group: string, includeCore: boolean) {
  const genes = new Map<string, { gene: string; mutations: number; first: number }>();
  for (const s of snps) {
    if (!s.gene || !inSelection(s, group, includeCore)) continue;
    const g = genes.get(s.gene) ?? { gene: s.gene, mutations: 0, first: s.position };
    g.mutations += 1;
    g.first = Math.min(g.first, s.position);
    genes.set(s.gene, g);
  }
  return [...genes.values()].sort((a, b) => a.first - b.first);
}

// For "All …" mode: how many of the selected mutations each sample carries.
export function effectCounts(group: string, includeCore: boolean, gene: string = ALL_GENES) {
  const counts = new Map<string, number>();
  for (const m of mutationsFor(group, includeCore, gene))
    for (const id of m.carriers) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

export function samplesWithSnp(snp: Snp) {
  const carriers = new Set(snp.carriers);
  return samples.filter((s) => carriers.has(s.id)).map((s) => ({ ...s, status: "Present" }));
}

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
