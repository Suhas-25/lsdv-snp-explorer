import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dna, MapPinned, CalendarRange, Activity } from "lucide-react";
import { DistrictPanel } from "@/components/DistrictPanel";
import { IndiaMap } from "@/components/IndiaMap";
import { Timeline } from "@/components/Timeline";
import { collectionEvents, collectionPlayback, DATE_HOLD_MS, DATE_TRAVEL_MS, filterCollectionDate } from "@/lib/collection-timeline";
import {
  ALL_EFFECTS, ALL_GENES, ALL_MUTATIONS, effectCounts, effectGroups, genesFor, mutationsFor, reference, samples, snps, samplesWithSnp,
} from "@/lib/snp-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mutation Distribution | LSDV Genomic Surveillance" },
      { name: "description", content: "Interactive map, table and timeline of LSDV samples carrying a selected mutation across Maharashtra and Odisha." },
      { property: "og:title", content: "Mutation Distribution | LSDV" },
      { property: "og:description", content: "Explore where Lumpy Skin Disease Virus mutations are circulating in India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_GROUP = effectGroups.includes("Missense") ? "Missense" : effectGroups[0] ?? "";
// Core mutations (in every sample) are never offered: they would light up every district.
// They stay in mutation_info.csv and the matrix.
const coreCount = snps.filter((s) => s.cls === "core").length;

function Panel({ icon: Icon, title, children, className = "", dense = false }: { icon: typeof Dna; title: string; children: React.ReactNode; className?: string; dense?: boolean }) {
  return (
    <section className={`panel panel-hover min-w-0 ${dense ? "panel-tight" : ""} ${className}`}>
      <h2 className={`flex items-center gap-2 font-display font-semibold text-foreground ${dense ? "mb-2 text-sm" : "mb-4 text-base"}`}>
        <span className={`grid place-items-center rounded-md bg-primary/10 text-primary ${dense ? "h-6 w-6" : "h-7 w-7"}`}><Icon className={dense ? "h-3.5 w-3.5" : "h-4 w-4"} /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Index() {
  const [hover, setHover] = useState<string | null>(null);

  // Effect → Gene → Mutation selection (non-core mutations only).
  const [group, setGroup] = useState(DEFAULT_GROUP);
  const [gene, setGene] = useState(ALL_GENES);
  const genes = useMemo(() => genesFor(group, false), [group]);
  const options = useMemo(() => mutationsFor(group, false, gene), [group, gene]);
  const [key, setKey] = useState(() => mutationsFor(DEFAULT_GROUP, false)[0]?.key ?? ALL_MUTATIONS);
  const allMode = key === ALL_MUTATIONS;
  const snp = allMode ? null : snps.find((s) => s.key === key) ?? null;
  const counts = useMemo(() => (allMode ? effectCounts(group, false, gene) : null), [allMode, group, gene]);
  const effectName = group === ALL_EFFECTS ? "All effects" : group;
  const geneName = gene === ALL_GENES ? "" : gene;
  const scope = `${group === ALL_EFFECTS ? "" : `${group} `}mutations${geneName ? ` in ${geneName}` : ""}`;  // e.g. "Frameshift mutations in LSDV047"
  const countLabel = `${scope.charAt(0).toLowerCase()}${scope.slice(1)}`;

  const hits = useMemo(() => {
    if (counts) return samples.filter((s) => (counts.get(s.id) ?? 0) > 0).map((s) => ({ ...s, status: `${counts.get(s.id)} mutations` }));
    return snp ? samplesWithSnp(snp) : [];
  }, [counts, snp]);

  const [elapsed, setElapsed] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const mh = hits.filter((h) => h.state === "Maharashtra").length;
  const od = hits.filter((h) => h.state === "Odisha").length;
  const [filter, setFilter] = useState<"all" | "Maharashtra" | "Odisha">("all");
  const stateHits = filter === "all" ? hits : hits.filter((h) => h.state === filter);
  const dates = collectionEvents(stateHits.filter((h) => h.date)).map(([date]) => date);
  const frame = elapsed === null ? null : collectionPlayback(dates, elapsed);
  const selectedDate = frame?.date ?? null;
  // Camera follows playback: it settles on the current date's districts and starts gliding toward the next date's while the cursor travels.
  const cameraDate = frame ? (frame.dwelling ? frame.date : dates[dates.indexOf(frame.date) + 1] ?? frame.date) : null;
  // District panel: hover highlights a district on the map; click zooms to it (playback takes over the camera while playing).
  const [pickDistrict, setPickDistrict] = useState<string | null>(null);
  const [hoverDistrict, setHoverDistrict] = useState<string | null>(null);
  const zoomTo = cameraDate ? [...new Set(filterCollectionDate(stateHits, cameraDate).map((h) => h.districtLgd))] : pickDistrict ? [pickDistrict] : null;
  useEffect(() => {
    if (!playing) return;
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setElapsed((current) => (current ?? 0) + delta);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing]);
  useEffect(() => {
    if (frame?.complete) setPlaying(false);
  }, [frame?.complete]);
  const resetTimeline = () => { setPlaying(false); setElapsed(null); setHover(null); };
  const playPause = () => {
    if (playing) { setPlaying(false); return; }
    if (elapsed === null || frame?.complete) setElapsed(0);
    setHover(null); setPickDistrict(null);
    setPlaying(true);
  };
  const carriers = new Set(filterCollectionDate(hits, selectedDate).map((h) => h.id));
  const visible = filterCollectionDate(samples, selectedDate);
  const seek = (date: string) => {
    const index = dates.indexOf(date);
    if (index < 0) return;
    setPlaying(false); setElapsed(index * (DATE_HOLD_MS + DATE_TRAVEL_MS)); setHover(null);
  };
  const toggle = (f: "Maharashtra" | "Odisha") => { resetTimeline(); setFilter((c) => (c === f ? "all" : f)); };

  // Changing the effect resets the gene; changing the effect or gene jumps to the first mutation of the new list.
  const chooseGroup = (g: string) => { resetTimeline(); setGroup(g); setGene(ALL_GENES); setKey(mutationsFor(g, false)[0]?.key ?? ALL_MUTATIONS); };
  const chooseGene = (g: string) => { resetTimeline(); setGene(g); setKey(g === ALL_GENES ? mutationsFor(group, false)[0]?.key ?? ALL_MUTATIONS : ALL_MUTATIONS); };

  const cards: [string, string | number][] = allMode
    ? [
        ["Effect", effectName], ["Gene", geneName || "All genes"], ["Mutations", options.length],
        ["Samples with ≥1", `${hits.length} of ${samples.length}`],
        ["Most in one sample", Math.max(0, ...[...(counts?.values() ?? [])])],
      ]
    : snp
      ? [
          ["Position", snp.position], ["Change", `${snp.ref}→${snp.alt}`], ["Gene", snp.gene || "—"], ["Protein", snp.protein || "—"],
          ["Effect", snp.effect.replaceAll("_variant", "").replaceAll("_", " ").replaceAll("&", " + ")], ["Impact", snp.impact || "—"],
          ["Carriers", `${snp.count} of ${samples.length} (${Math.round(snp.freq * 100)}%)`],
        ]
      : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-band">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-4 px-6 py-3">
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-75">LSDV Genomic Surveillance · Level 2</p>
            <h1 className="font-display text-xl font-bold md:text-2xl">Mutation Distribution</h1>
            <p className="font-mono text-[11px] opacity-75">Reference {reference} · {samples.length} NCL-BAIF isolates (Dharini snippy-fasta) · {snps.length} mutations ({coreCount} core, in every sample, not listed) · {new Set(samples.map((s) => s.state)).size} states</p>
          </div>
          <label className="flex min-w-[170px] flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Effect</span>
            <select value={group} onChange={(e) => chooseGroup(e.target.value)} className="snp-select">
              <option value={ALL_EFFECTS}>All effects ({mutationsFor(ALL_EFFECTS, false).length})</option>
              {effectGroups.map((g) => <option key={g} value={g}>{g} ({mutationsFor(g, false).length})</option>)}
            </select>
          </label>
          <label className="flex min-w-[150px] flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Gene</span>
            <select value={gene} onChange={(e) => chooseGene(e.target.value)} className="snp-select">
              <option value={ALL_GENES}>All genes ({genes.length})</option>
              {genes.map((g) => <option key={g.gene} value={g.gene}>{g.gene} ({g.mutations})</option>)}
            </select>
          </label>
          <label className="flex min-w-[260px] flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">Mutation</span>
            <select value={key} onChange={(e) => { resetTimeline(); setKey(e.target.value); }} className="snp-select">
              <option value={ALL_MUTATIONS}>All {scope} ({options.length})</option>
              {options.map((s) => <option key={s.key} value={s.key}>{s.label} · {s.count}/{samples.length}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={allMode ? `Samples with ${scope}` : "Samples with mutation"} value={hits.length} sub={`of ${samples.length} sequenced · click to show all`} tone="primary" active={filter === "all"} onClick={() => { resetTimeline(); setFilter("all"); }} />
          <Stat label="Maharashtra" value={mh} sub="click to filter" tone="mh" active={filter === "Maharashtra"} onClick={() => toggle("Maharashtra")} />
          <Stat label="Odisha" value={od} sub="click to filter" tone="od" active={filter === "Odisha"} onClick={() => toggle("Odisha")} />
        </div>

        <div className="min-w-0 space-y-4">
            <Panel icon={Dna} title={allMode ? `All ${scope}` : "Selected mutation"}>
              {cards.length ? (
                <dl className={`grid grid-cols-2 gap-3 font-mono text-sm ${allMode ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                  {cards.map(([k, v]) => (
                    <div key={k} className="tile-pop min-w-0 rounded-lg bg-muted px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">{k}</dt><dd className="truncate text-lg font-semibold text-foreground" title={String(v)}>{v}</dd></div>
                  ))}
                </dl>
              ) : <p className="text-sm text-muted-foreground">No {countLabel} outside the core. Pick another effect or gene.</p>}
            </Panel>
          <Panel icon={MapPinned} title="Geographic distribution" dense>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
              <div className="h-[min(65vh,600px)] min-h-[340px] w-full">
                <IndiaMap active={allMode || !!snp} all={visible} carriers={carriers} counts={counts} countLabel={countLabel} hover={hover} onHover={setHover} highlight={hoverDistrict ?? pickDistrict} focus={filter === "all" ? null : filter} blink={playing && !!frame?.dwelling} zoomTo={zoomTo} onStateClick={(n) => (n === "Maharashtra" || n === "Odisha") && toggle(n)} />
              </div>
              <DistrictPanel all={visible} carriers={carriers} counts={counts} active={allMode || !!snp} focus={filter === "all" ? null : filter}
                selected={pickDistrict} onSelect={setPickDistrict} onHover={setHoverDistrict} className="max-h-80 lg:h-[min(65vh,600px)] lg:max-h-none" />
            </div>
            <div className="mt-1.5 border-t border-border/70 pt-1.5">
              <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary"><CalendarRange className="h-3.5 w-3.5" /></span>
                Collection timeline
              </h3>
              <Timeline hits={stateHits.filter((h) => h.date)} selectedDate={selectedDate} cursorTime={frame?.time ?? null} playing={playing} complete={frame?.complete ?? false} onPlayPause={playPause} onRestart={resetTimeline} onSeek={seek} />
            </div>
          </Panel>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Samples are plotted at district centroids, matched by LGD code. Core mutations (present in every sample) are not listed; they are in mutation_info.csv. State and national boundaries: DataMeet (official Survey of India outline); district boundaries: Dharini (LGD). Reference genome: {reference}</p>
      </main>
    </div>
  );
}

function Stat({ label, value, sub, tone, active, onClick }: { label: string; value: number; sub: string; tone: "primary" | "mh" | "od"; active: boolean; onClick: () => void }) {
  const bar = { primary: "bg-primary", mh: "bg-mh", od: "bg-od" }[tone];
  return (
    <button type="button" onClick={onClick} className={`panel panel-hover stat-pop relative overflow-hidden text-left ${active ? "stat-active" : ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}
