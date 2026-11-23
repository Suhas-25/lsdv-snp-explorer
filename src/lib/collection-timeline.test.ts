import { describe, expect, it } from "vitest";
import { collectionEvents, collectionPlayback, collectionTimeScale, DATE_HOLD_MS, DATE_TRAVEL_MS, filterCollectionDate } from "./collection-timeline";
import { samplesWithSnp, snps } from "./snp-data";

// 2475:C>A (LSDV005, p.Phe10Leu) is carried by all five Dharini samples.
const snp = snps.find((s) => s.key === "2475:C>A");
if (!snp) throw new Error("Expected mutation 2475:C>A");
const hits = samplesWithSnp(snp);
// 18619:AA>T (LSDV026 frameshift) is carried by four samples: every one except the Pune isolate.
const frameshift = snps.find((s) => s.key === "18619:AA>T");
if (!frameshift) throw new Error("Expected mutation 18619:AA>T");

describe("Linked collection-date filtering", () => {
  it("plays the supplied dates from earliest to latest and stops at the end", () => {
    const dates = collectionEvents(hits).map(([date]) => date);
    const segment = DATE_HOLD_MS + DATE_TRAVEL_MS;
    expect(collectionPlayback(dates, 0)?.date).toBe("2022-12-21");
    expect(collectionPlayback(dates, segment)?.date).toBe("2023-08-12");
    expect(collectionPlayback(dates, segment * 2)?.date).toBe("2023-08-16");
    expect(collectionPlayback(dates, segment * 3)?.date).toBe("2023-08-22");
    expect(collectionPlayback(dates, segment * 3 + DATE_HOLD_MS)?.complete).toBe(true);
    expect(collectionPlayback(dates, 999999)?.date).toBe("2023-08-22");
  });
  it("moves the cursor continuously between the real collection dates", () => {
    const frame = collectionPlayback(["2022-12-21", "2023-08-12"], DATE_HOLD_MS + DATE_TRAVEL_MS / 2);
    expect(frame?.time).toBe((Date.parse("2022-12-21T00:00:00Z") + Date.parse("2023-08-12T00:00:00Z")) / 2);
    expect(frame?.dwelling).toBe(false);
  });
  it("highlights Pune in December and the Odisha districts on 22 Aug using only the selected SNP carriers", () => {
    const dates = collectionEvents(hits).map(([date]) => date);
    const first = collectionPlayback(dates, 0);
    const last = collectionPlayback(dates, 3 * (DATE_HOLD_MS + DATE_TRAVEL_MS));
    expect(filterCollectionDate(hits, first?.date ?? null).map((sample) => sample.district)).toEqual(["Pune"]);
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
  it("uses the four actual collection dates in chronological order", () => {
    expect(collectionEvents(hits).map(([date, group]) => [date, group.length])).toEqual([
      ["2022-12-21", 1], ["2023-08-12", 1], ["2023-08-16", 1], ["2023-08-22", 2],
    ]);
  });
  it("limits the selected SNP carriers to 21 Dec 2022", () => {
    expect(filterCollectionDate(hits, "2022-12-21").map((s) => s.id)).toEqual(["PP488403"]);
  });
  it("replaces the date selection with 22 Aug 2023", () => {
    expect(new Set(filterCollectionDate(hits, "2023-08-22").map((s) => s.id))).toEqual(new Set(["PP488432", "PP488434"]));
  });
  it("Show All restores all carriers of the same selected SNP", () => {
    expect(filterCollectionDate(hits, null)).toEqual(hits);
    expect(filterCollectionDate(hits, null)).toHaveLength(5);
  });
  it("retains state filtering when resetting the date", () => {
    const stateHits = hits.filter((s) => s.state === "Maharashtra");
    expect(filterCollectionDate(stateHits, "2023-08-12")).toHaveLength(1);
    expect(filterCollectionDate(stateHits, null)).toHaveLength(3);
    expect(filterCollectionDate(stateHits, "2023-08-22")).toEqual([]);
  });
  it("never includes samples outside the selected SNP carriers", () => {
    const carriers = samplesWithSnp(frameshift);
    expect(carriers.map((s) => s.id).sort()).toEqual(["PP488409", "PP488418", "PP488432", "PP488434"]);
    expect(filterCollectionDate(carriers, "2022-12-21")).toEqual([]);
  });
  it("places every sample on a district shape by LGD code", () => {
    expect(new Set(hits.map((s) => s.districtLgd))).toEqual(new Set(["466", "487", "490", "344", "365"]));
  });
});