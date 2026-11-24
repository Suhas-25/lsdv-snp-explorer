import { describe, expect, it } from "vitest";
import { ALL_EFFECTS, effectCounts, effectGroups, genesFor, mutationsFor, samples, snps } from "./snp-data";

describe("Effect → Mutation selection", () => {
  it("offers every effect group present in the data", () => {
    expect(effectGroups).toContain("Missense");
    expect(effectGroups).toContain("Synonymous");
    expect(effectGroups).toContain("Frameshift");
  });
  it("lists only mutations of the chosen effect, hiding core ones by default", () => {
    const missense = mutationsFor("Missense", false);
    expect(missense.length).toBe(39); // 38 shared + 1 singleton
    expect(missense.every((m) => m.effectGroup === "Missense" && m.cls !== "core")).toBe(true);
    expect(mutationsFor("Missense", true).length).toBe(56); // + 17 core
  });
  it("orders the list from most to least common", () => {
    const counts = mutationsFor("Frameshift", false).map((m) => m.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
  it("counts each sample's mutations of an effect from the carriers lists", () => {
    const counts = effectCounts("Missense", true);
    // With core included this equals the per-sample Missense total from build_matrix.py
    for (const s of samples) expect(counts.get(s.id) ?? 0).toBe(s.effects["Missense"]);
  });
  it("puts every mutation in exactly one effect group", () => {
    const total = effectGroups.reduce((n, g) => n + mutationsFor(g, true).length, 0);
    expect(total).toBe(snps.length);
  });
});

describe("Gene filter and All effects", () => {
  it("All effects lists every mutation (with core) or every non-core one", () => {
    expect(mutationsFor(ALL_EFFECTS, true).length).toBe(snps.length);
    expect(mutationsFor(ALL_EFFECTS, false).every((m) => m.cls !== "core")).toBe(true);
  });
  it("lists only genes that have mutations of the chosen effect, with correct counts", () => {
    const genes = genesFor("Frameshift", false);
    for (const g of genes) expect(mutationsFor("Frameshift", false, g.gene).length).toBe(g.mutations);
    expect(genes.reduce((n, g) => n + g.mutations, 0)).toBe(mutationsFor("Frameshift", false).length);
  });
  it("narrows mutations to one gene (LSDV047 frameshift at 41403)", () => {
    const keys = mutationsFor("Frameshift", false, "LSDV047").map((m) => m.key);
    expect(keys).toContain("41403:GA>G");
    expect(mutationsFor(ALL_EFFECTS, true, "LSDV047").every((m) => m.gene === "LSDV047")).toBe(true);
  });
  it("counts per sample within one gene", () => {
    const counts = effectCounts(ALL_EFFECTS, true, "LSDV047");
    const expected = new Map<string, number>();
    for (const m of snps.filter((x) => x.gene === "LSDV047")) for (const id of m.carriers) expected.set(id, (expected.get(id) ?? 0) + 1);
    expect(counts).toEqual(expected);
  });
});
