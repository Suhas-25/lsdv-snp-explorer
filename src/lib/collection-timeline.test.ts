import { describe, expect, it } from "vitest";
import { collectionEvents, collectionPlayback, collectionTimeScale, DATE_HOLD_MS, DATE_TRAVEL_MS, filterCollectionDate } from "./collection-timeline";
import { samplesWithSnp, snps } from "./snp-data";

const snp = snps.find((s) => s.position === 12964);
if (!snp) throw new Error("Expected supplied SNP 12964 G→A");
const hits = samplesWithSnp(snp);

describe("Linked collection-date filtering", () => {
  it("plays the supplied dates from earliest to latest and stops at the end", () => {
    const dates = collectionEvents(hits).map(([date]) => date);
    const segment = DATE_HOLD_MS + DATE_TRAVEL_MS;
    expect(collectionPlayback(dates, 0)?.date).toBe("2022-12-21");
    expect(collectionPlayback(dates, segment)?.date).toBe("2023-08-12");
    expect(collectionPlayback(dates, segment * 2)?.date).toBe("2023-08-22");
    expect(collectionPlayback(dates, segment * 2 + DATE_HOLD_MS)?.complete).toBe(true);
    expect(collectionPlayback(dates, 999999)?.date).toBe("2023-08-22");
  });
  it("moves the cursor continuously between the real collection dates", () => {
    const frame = collectionPlayback(["2022-12-21", "2023-08-12"], DATE_HOLD_MS + DATE_TRAVEL_MS / 2);
    expect(frame?.time).toBe((Date.parse("2022-12-21T00:00:00Z") + Date.parse("2023-08-12T00:00:00Z")) / 2);
    expect(frame?.dwelling).toBe(false);
  });
  it("highlights Pune in December and Mayurbhanj in August using only the selected SNP carriers", () => {
    const dates = collectionEvents(hits).map(([date]) => date);
    const first = collectionPlayback(dates, 0);
    const last = collectionPlayback(dates, 2 * (DATE_HOLD_MS + DATE_TRAVEL_MS));
    expect(filterCollectionDate(hits, first?.date ?? null).map((sample) => sample.district)).toEqual(["Pune", "Pune"]);
    expect(new Set(filterCollectionDate(hits, last?.date ?? null).map((sample) => sample.district))).toEqual(new Set(["Angul", "Mayurbhanj"]));
  });
  it("handles no dates and a single collection date", () => {
    expect(collectionPlayback([], 0)).toBeNull();
    expect(collectionPlayback(["2022-12-21"], DATE_HOLD_MS)).toMatchObject({ date: "2022-12-21", complete: true });
  });
  it("positions samples by elapsed days rather than equally spaced date categories", () => {
    const scale = collectionTimeScale(["2022-12-21", "2023-08-12", "2023-08-22"]);
    const longGap = scale.position("2023-08-12") - scale.position("2022-12-21");
    const shortGap = scale.position("2023-08-22") - scale.position("2023-08-12");
    expect(longGap / shortGap).toBeCloseTo(23.4);
    expect(scale.months[0]).toBe("2022-12-01");
    expect(scale.months).toContain("2023-08-01");
  });
  it("uses the three actual collection dates in chronological order", () => {
    expect(collectionEvents(hits).map(([date, group]) => [date, group.length])).toEqual([
      ["2022-12-21", 2], ["2023-08-12", 2], ["2023-08-22", 5],
    ]);
  });
  it("limits the selected SNP carriers to 21 Dec 2022", () => {
    expect(filterCollectionDate(hits, "2022-12-21").map((s) => s.id)).toEqual([
      "NCL-BAIF-LSDV004", "NCL-BAIF-LSDV006",
    ]);
  });
  it("replaces the date selection with 22 Aug 2023", () => {
    expect(filterCollectionDate(hits, "2023-08-22").map((s) => s.id)).toEqual([
      "NCL-BAIF-LSDV100", "NCL-BAIF-LSDV106", "NCL-BAIF-LSDV079", "NCL-BAIF-LSDV086", "NCL-BAIF-LSDV096",
    ]);
  });
  it("Show All restores all carriers of the same selected SNP", () => {
    expect(filterCollectionDate(hits, null)).toEqual(hits);
    expect(filterCollectionDate(hits, null)).toHaveLength(9);
  });
  it("retains state filtering when resetting the date", () => {
    const stateHits = hits.filter((s) => s.state === "Maharashtra");
    expect(filterCollectionDate(stateHits, "2023-08-12")).toHaveLength(2);
    expect(filterCollectionDate(stateHits, null)).toHaveLength(4);
    expect(filterCollectionDate(stateHits, "2023-08-22")).toEqual([]);
  });
  it("never includes samples outside the selected SNP carriers", () => {
    const restricted = hits.filter((s) => s.id === "NCL-BAIF-LSDV004");
    expect(filterCollectionDate(restricted, "2022-12-21").map((s) => s.id)).toEqual(["NCL-BAIF-LSDV004"]);
  });
});