import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Dna, MapPinned, Table2, CalendarRange, Activity } from "lucide-react";
import { IndiaMap } from "@/components/IndiaMap";
import { Timeline } from "@/components/Timeline";
import { filterCollectionDate } from "@/lib/collection-timeline";
import { samples, snps, samplesWithSnp } from "@/lib/snp-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Selected SNP Distribution | LSDV Genomic Surveillance" },
      { name: "description", content: "Interactive map, table and timeline of LSDV samples carrying a selected SNP across Maharashtra and Odisha." },
      { property: "og:title", content: "Selected SNP Distribution | LSDV" },
      { property: "og:description", content: "Explore where a selected Lumpy Skin Disease Virus SNP is circulating in India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function Panel({ icon: Icon, title, children, className = "" }: { icon: typeof Dna; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel panel-hover min-w-0 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Index() {
  const [hover, setHover] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const snp = snps.find((s) => s.key === key) ?? null;
  const hits = useMemo(() => (snp ? samplesWithSnp(snp) : []), [snp]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const mh = hits.filter((h) => h.state === "Maharashtra").length;
  const od = hits.filter((h) => h.state === "Odisha").length;
  const [filter, setFilter] = useState<"all" | "Maharashtra" | "Odisha">("all");
  const stateHits = filter === "all" ? hits : hits.filter((h) => h.state === filter);
  const shown = filterCollectionDate(stateHits, selectedDate);
  const carriers = new Set(filterCollectionDate(hits, selectedDate).map((h) => h.id));
  const selectDate = (date: string | null) => { setSelectedDate(date); setHover(null); };
  const toggle = (f: "Maharashtra" | "Odisha") => setFilter((c) => (c === f ? "all" : f));

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-band">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-6 py-7">
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-75">LSDV Genomic Surveillance</p>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Selected SNP Distribution</h1>
            <p className="text-sm opacity-80">Where is this mutation circulating?</p>
          </div>
          <label className="flex min-w-[240px] flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">Select SNP</span>
            <select value={key} onChange={(e) => { setKey(e.target.value); setHover(null); }} className="snp-select">
              <option value="" disabled>Choose a SNP…</option>
              {snps.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total samples with SNP" value={hits.length} sub={`of ${samples.length} sequenced · click to show all`} tone="primary" active={filter === "all"} onClick={() => setFilter("all")} />
          <Stat label="Maharashtra" value={mh} sub="click to filter" tone="mh" active={filter === "Maharashtra"} onClick={() => toggle("Maharashtra")} />
          <Stat label="Odisha" value={od} sub="click to filter" tone="od" active={filter === "Odisha"} onClick={() => toggle("Odisha")} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel icon={MapPinned} title="Geographic distribution">
            <IndiaMap active={!!snp} all={filterCollectionDate(samples, selectedDate)} carriers={carriers} hover={hover} onHover={setHover} focus={filter === "all" ? null : filter} onStateClick={(n) => (n === "Maharashtra" || n === "Odisha") && toggle(n)} />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Legend cls="bg-mh" label="Maharashtra (SNP present)" />
              <Legend cls="bg-od" label="Odisha (SNP present)" />
              <Legend cls="bg-background border border-foreground/60" label="SNP absent" />
            </div>
          </Panel>
          <Panel icon={CalendarRange} title="Collection timeline">
            <Timeline hits={stateHits} hover={hover} onHover={setHover} selectedDate={selectedDate} onDateChange={selectDate} />
          </Panel>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-3">
            <Panel icon={Dna} title="Selected SNP">
              <dl className="grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
                {[["Position", snp?.position ?? "—"], ["REF", snp?.ref ?? "—"], ["ALT", snp?.alt ?? "—"], ["States", new Set(hits.map((h) => h.state)).size]].map(([k, v]) => (
                  <div key={k} className="tile-pop rounded-lg bg-muted px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">{k}</dt><dd className="text-lg font-semibold text-foreground">{v}</dd></div>
                ))}
              </dl>
            </Panel>

            <Panel icon={Table2} title={snp ? `Samples carrying ${snp.label}` : "Samples carrying selected SNP"}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>{["Sample ID", "State", "District", "Collection Date", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {shown.map((h) => (
                      <tr key={h.id} onMouseEnter={() => setHover(h.id)} onMouseLeave={() => setHover(null)} className={`row-hover border-b border-border/60 ${hover === h.id ? "row-active" : ""}`}>
                        <td className="px-3 py-2 font-mono text-xs">{h.id}</td>
                        <td className="px-3 py-2"><span className={`inline-flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full ${h.state === "Maharashtra" ? "bg-mh" : "bg-od"}`} />{h.state}</span></td>
                        <td className="px-3 py-2">{h.district}</td>
                        <td className="px-3 py-2 font-mono text-xs">{fmt(h.date)}</td>
                        <td className="px-3 py-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{h.status}</span></td>
                      </tr>
                    ))}
                    {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{snp ? "No samples match the selected SNP, state and collection date." : "Select a SNP above to see which samples carry it."}</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" /> District locations are approximate centroids. Reference genome: NC_003027.1</p>
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

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${cls}`} />{label}</span>;
}
