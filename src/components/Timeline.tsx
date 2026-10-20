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
  const first = events[0]?.[0];
  const last = events.at(-1)?.[0];
  const hovered = hits.find((sample) => sample.id === hover);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">{selectedDate ? label(selectedDate) : "All collection dates"}</p>
        <Button type="button" size="sm" variant={selectedDate === null ? "default" : "outline"} aria-pressed={selectedDate === null} onClick={() => onDateChange(null)}>Show All</Button>
      </div>
      {!events.length ? <p className="py-6 text-center text-sm text-muted-foreground">No collection dates for the current selection.</p> : <>
        <div className="flex flex-wrap gap-2 text-xs">
          {first && <span className="chip">First: <b>{label(first)}</b></span>}
          {last && <span className="chip">Latest: <b>{label(last)}</b></span>}
          <span className="chip">Collection events: <b>{events.length}</b></span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[300px] gap-2" role="group" aria-label="Collection dates">
            {events.map(([date, group]) => {
              const mh = group.filter((sample) => sample.state === "Maharashtra").length;
              const od = group.filter((sample) => sample.state === "Odisha").length;
              const active = date === selectedDate;
              return (
                <div key={date} className="min-w-24 flex-1">
                  <Button type="button" variant="ghost" aria-label={label(date)} aria-pressed={active} onClick={() => onDateChange(date)}
                    className={`h-auto w-full flex-col gap-0 rounded-md px-1 py-2 ${active ? "bg-accent text-accent-foreground ring-2 ring-primary" : selectedDate ? "opacity-60" : ""}`}>
                    <span className="flex h-36 w-full flex-col items-center justify-end border-b border-border pb-1">
                      <span className="mb-1 font-mono text-sm font-semibold">{group.length}</span>
                      <span className="bar-pop flex w-10 flex-col overflow-hidden rounded-t-md" style={{ height: `${group.length / max * 100}px` }}>
                        {od > 0 && <span className="bg-od" style={{ flex: od }} />}
                        {mh > 0 && <span className="bg-mh" style={{ flex: mh }} />}
                      </span>
                    </span>
                    <span className="mt-2 whitespace-nowrap font-mono text-[10px] font-semibold">{label(date)}</span>
                    <span className="mt-1 text-[10px] text-muted-foreground">{group.length} samples</span>
                  </Button>
                  <div className="mt-3 flex min-h-5 flex-wrap justify-center gap-1.5">
                    {group.map((sample) => <Button key={sample.id} type="button" variant="ghost" aria-label={`Select ${label(date)} for ${sample.id}`} title={`${sample.id} · ${sample.district} · ${sample.type}`}
                      onClick={() => onDateChange(date)} onMouseEnter={() => onHover(sample.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(sample.id)} onBlur={() => onHover(null)}
                      className={`tl-dot h-4 w-4 p-0 ${sample.state === "Maharashtra" ? "bg-mh hover:bg-mh" : "bg-od hover:bg-od"} ${hover === sample.id ? "tl-dot-active" : ""}`} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Collection date</p>
        <p className="min-h-8 text-xs text-muted-foreground">{hovered && <><b className="text-foreground">{hovered.id}</b> · {hovered.district}, {hovered.state} · {label(hovered.date)} · {hovered.type}</>}</p>
      </>}
    </div>
  );
}
