import { describe, expect, it } from "vitest";
import { effectCounts, effectGroups, mutationsFor, samples, snps } from "./snp-data";

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
    for (const s of samples) expect(counts.get(s.id) ?? 0).toBe(s.effects.Missense);
  });
  it("puts every mutation in exactly one effect group", () => {
    const total = effectGroups.reduce((n, g) => n + mutationsFor(g, true).length, 0);
    expect(total).toBe(snps.length);
  });
});
