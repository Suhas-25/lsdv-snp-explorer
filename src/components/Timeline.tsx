import type { Sample } from "@/lib/snp-data";
import { collectionEvents } from "@/lib/collection-timeline";
import { Button } from "@/components/ui/button";

type Hit = Sample & { status: string };
const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function Timeline({ hits, hover, onHover, selectedDate, onDateChange }: {
  hits: Hit[]; hover: string | null; onHover: (id: string | null) => void;
  selectedDate: string | null; onDateChange: (date: string | null) => void;
}) {
  const events = collectionEvents(hits);
  const max = Math.max(1, ...events.map(([, group]) => group.length));
  const ceiling = Math.max(2, max);
  const ticks = Array.from({ length: ceiling + 1 }, (_, i) => i);
  const hovered = hits.find((sample) => sample.id === hover);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">{selectedDate ? label(selectedDate) : "All collection dates"}</p>
        <Button type="button" size="sm" variant={selectedDate === null ? "default" : "outline"} aria-pressed={selectedDate === null} onClick={() => onDateChange(null)}>Show All</Button>
      </div>
      {!events.length ? <p className="py-6 text-center text-sm text-muted-foreground">No collection dates for the current selection.</p> : <>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-mh" />Maharashtra</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-od" />Odisha</span>
        </div>
        <div className="overflow-x-auto pb-1">
          <p className="mb-5 text-[11px] font-medium text-muted-foreground">Carrier samples</p>
          <div className="relative min-w-[270px] pl-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 pl-6" aria-hidden="true">
              {ticks.map((tick) => <div key={tick} className={`absolute right-0 left-6 border-t ${tick === 0 ? "border-border" : "border-dashed border-border/60"}`} style={{ bottom: `${tick / ceiling * 100}%` }}>
                <span className="absolute right-full -mt-2 mr-2 font-mono text-[10px] text-muted-foreground">{tick}</span>
              </div>)}
            </div>
          <div className="relative flex" role="group" aria-label="Collection dates">
            {events.map(([date, group]) => {
              const mh = group.filter((sample) => sample.state === "Maharashtra").length;
              const od = group.filter((sample) => sample.state === "Odisha").length;
              const active = date === selectedDate;
              return (
                <div key={date} className="min-w-20 flex-1">
                  <Button type="button" variant="ghost" aria-label={label(date)} aria-pressed={active} onClick={() => onDateChange(date)}
                    title={`${label(date)} · ${mh} Maharashtra · ${od} Odisha`}
                    className={`group h-auto w-full flex-col gap-0 rounded-none px-1 py-0 hover:bg-transparent ${selectedDate && !active ? "opacity-45" : ""}`}>
                    <span className="relative flex h-40 w-full flex-col items-center justify-end">
                      <span className={`absolute bottom-0 w-16 rounded-t-md transition-colors ${active ? "bg-accent/70" : "group-hover:bg-accent/40"}`} style={{ height: `${group.length / ceiling * 100}%` }} />
                      <span className="relative flex w-10 flex-col items-center justify-end" style={{ height: `${group.length / ceiling * 100}%` }}>
                      <span className="absolute bottom-full mb-1.5 font-mono text-xs font-semibold text-foreground">{group.length}</span>
                      <span className={`bar-pop flex h-full w-10 flex-col overflow-hidden rounded-t-sm ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}>
                        {od > 0 && <span className="bg-od" style={{ flex: od }} />}
                        {mh > 0 && <span className="bg-mh" style={{ flex: mh }} />}
                      </span>
                      </span>
                    </span>
                    <span className="h-2 w-px bg-border" />
                    <span className={`mt-1 whitespace-nowrap border-b-2 pb-1 font-mono text-[10px] ${active ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"}`}>{label(date)}</span>
                  </Button>
                  <div className="mt-2 flex min-h-4 flex-wrap justify-center gap-1">
                    {group.map((sample) => <Button key={sample.id} type="button" variant="ghost" aria-label={`Select ${label(date)} for ${sample.id}`} title={`${sample.id} · ${sample.district} · ${sample.type}`}
                      onClick={() => onDateChange(date)} onMouseEnter={() => onHover(sample.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(sample.id)} onBlur={() => onHover(null)}
                      className={`h-2 w-2 rounded-full p-0 transition-transform ${sample.state === "Maharashtra" ? "bg-mh hover:bg-mh" : "bg-od hover:bg-od"} ${hover === sample.id ? "scale-150 ring-2 ring-ring ring-offset-1" : ""}`} />)}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
        <p className="text-center text-[11px] font-medium text-muted-foreground">Collection date</p>
        {hovered && <p className="text-xs text-muted-foreground"><b className="text-foreground">{hovered.id}</b> · {hovered.district}, {hovered.state} · {label(hovered.date)} · {hovered.type}</p>}
      </>}
    </div>
  );
}
