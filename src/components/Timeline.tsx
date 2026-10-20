import type { Sample } from "@/lib/snp-data";
import { collectionEvents, collectionTimeScale } from "@/lib/collection-timeline";
import { Button } from "@/components/ui/button";

type Hit = Sample & { status: string };
const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function Timeline({ hits, hover, onHover, selectedDate, onDateChange }: {
  hits: Hit[]; hover: string | null; onHover: (id: string | null) => void;
  selectedDate: string | null; onDateChange: (date: string | null) => void;
}) {
  const events = collectionEvents(hits);
  const scale = events.length ? collectionTimeScale(events.map(([date]) => date)) : null;
  const hovered = hits.find((sample) => sample.id === hover);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mh" />Maharashtra</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-od" />Odisha</span>
          <span className="font-medium text-foreground" aria-live="polite">{selectedDate ? label(selectedDate) : "All collection dates"}</span>
        </div>
        <Button type="button" size="sm" variant={selectedDate === null ? "default" : "outline"} aria-pressed={selectedDate === null} onClick={() => onDateChange(null)}>Show All</Button>
      </div>
      {!scale ? <p className="py-6 text-center text-sm text-muted-foreground">No collection dates for the current selection.</p> : <>
        <div className="overflow-x-auto px-2 pb-2">
          <div className="relative mx-6 h-60 min-w-[840px]" role="group" aria-label="Collection dates">
            {scale.months.map((date) => <div key={date} className="pointer-events-none absolute top-4 h-40 border-l border-dashed border-border/70" style={{ left: `${scale.position(date)}%` }}>
              <span className="absolute top-40 left-0 h-2 border-l border-border" />
              <span className="absolute top-[174px] left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{monthLabel(date)}</span>
            </div>)}
            <div className="pointer-events-none absolute inset-x-0 top-44 h-px bg-border" />
            {events.map(([date, group], index) => {
              const active = selectedDate === date;
              const nearby = index > 0 && scale.position(date) - scale.position(events[index - 1][0]) < 12;
              return <div key={date} className={`absolute top-4 h-40 w-7 -translate-x-1/2 ${selectedDate && !active ? "opacity-40" : ""}`} style={{ left: `${scale.position(date)}%` }}>
                {active && <div className="pointer-events-none absolute -inset-x-2 inset-y-0 rounded-sm bg-accent/70" />}
                <div className="absolute inset-x-0 bottom-3 flex flex-col-reverse items-center gap-1.5">
                  {group.map((sample) => <Button key={sample.id} type="button" variant="ghost" aria-label={`Select ${label(date)} for ${sample.id}`} title={`${sample.id} · ${sample.district} · ${label(date)}`}
                    onClick={() => onDateChange(date)} onMouseEnter={() => onHover(sample.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(sample.id)} onBlur={() => onHover(null)}
                    className={`relative h-5 w-5 shrink-0 rounded-full border-2 border-card p-0 transition-transform motion-reduce:transition-none ${sample.state === "Maharashtra" ? "bg-mh hover:bg-mh" : "bg-od hover:bg-od"} ${hover === sample.id ? "scale-125 ring-2 ring-ring" : ""} ${active ? "ring-1 ring-primary" : ""}`} />)}
                  <span className="mb-1 font-mono text-[11px] font-semibold text-foreground">{group.length}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" aria-label={label(date)} aria-pressed={active} onClick={() => onDateChange(date)}
                  className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 font-mono text-[10px] ${nearby ? "-top-4" : "-top-10"} ${active ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-muted text-foreground"}`}>{label(date)}</Button>
              </div>;
            })}
          </div>
        </div>
        <p className="text-center text-xs font-medium text-muted-foreground">Collection date</p>
        <div className="min-h-5 text-xs text-muted-foreground">{hovered && <><b className="text-foreground">{hovered.id}</b> · {hovered.district}, {hovered.state} · {label(hovered.date)} · {hovered.type}</>}</div>
      </>}
    </div>
  );
}
