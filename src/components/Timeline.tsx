import { Pause, Play, RotateCcw } from "lucide-react";
import type { Sample } from "@/lib/snp-data";
import { collectionEvents, collectionTimeScale } from "@/lib/collection-timeline";
import { Button } from "@/components/ui/button";

type Hit = Sample & { status: string };
const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function Timeline({ hits, selectedDate, cursorTime, playing, complete, onPlayPause, onRestart, onSeek }: {
  hits: Hit[]; selectedDate: string | null; cursorTime: number | null; playing: boolean; complete: boolean;
  onPlayPause: () => void; onRestart: () => void; onSeek: (date: string) => void;
}) {
  const events = collectionEvents(hits);
  const dates = events.map(([date]) => date);
  const scale = dates.length ? collectionTimeScale(dates) : null;
  const first = dates[0];
  const last = dates[dates.length - 1];
  const time = cursorTime ?? (first ? Date.parse(`${first}T00:00:00Z`) : 0);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" disabled={!first} aria-label={playing ? "Pause timeline" : complete ? "Replay timeline" : "Play timeline"} title={playing ? "Pause" : "Play"} onClick={onPlayPause}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button type="button" size="icon" variant="outline" disabled={!first} aria-label="Reset timeline" title="Reset timeline" onClick={onRestart}><RotateCcw /></Button>
        <span className="ml-2 font-mono text-sm font-semibold text-foreground" aria-live="polite">{selectedDate ? label(selectedDate) : "All collection dates"}</span>
        {complete && <span className="text-xs text-muted-foreground">Complete</span>}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mh" />Maharashtra</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-od" />Odisha</span>
      </div>
    </div>
    {!scale || !first || !last ? <p className="py-6 text-center text-sm text-muted-foreground">{hits.length ? "No collection dates available." : "Select a SNP with carrier samples to play the timeline."}</p> : <>
      <div className="overflow-x-auto pt-6 pb-2">
        <div className="relative mx-8 h-44 min-w-[700px]" role="img" aria-label="Collection timeline with samples positioned by collection date">
          {scale.months.map((date) => <div key={date} className="pointer-events-none absolute top-0 h-28 border-l border-dashed border-border" style={{ left: `${scale.position(date)}%` }}>
            <span className="absolute top-32 left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{monthLabel(date)}</span>
          </div>)}
          <div className="absolute inset-x-0 top-28 h-px bg-border" />
          {events.map(([date, group]) => <div key={date} className={`absolute top-0 h-28 w-6 -translate-x-1/2 ${selectedDate && selectedDate !== date ? "opacity-35" : ""}`} style={{ left: `${scale.position(date)}%` }}>
            <div className="absolute inset-x-0 bottom-2 flex flex-col-reverse items-center gap-1.5">
              {group.map((sample) => <span key={sample.id} title={`${sample.id} · ${sample.district} · ${label(date)}`} className={`h-3 w-3 rounded-full border border-card ${sample.state === "Maharashtra" ? "bg-mh" : "bg-od"} ${selectedDate === date ? "ring-2 ring-ring/40" : ""}`} />)}
              <span className="mb-1 font-mono text-[11px] font-semibold text-foreground">{group.length}</span>
            </div>
          </div>)}
          <div className="pointer-events-none absolute top-0 h-32 w-px bg-primary" style={{ left: `${scale.positionTime(time)}%` }}>
            <span className="absolute -top-3 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-primary" />
          </div>
        </div>
      </div>
      <input type="range" className="timeline-slider w-full" aria-label="Playback time" aria-valuetext={selectedDate ? label(selectedDate) : label(first)} min={Date.parse(`${first}T00:00:00Z`)} max={Date.parse(`${last}T00:00:00Z`) || 1} step={86400000} value={time} disabled={dates.length < 2}
        onChange={(event) => {
          const requested = Number(event.target.value);
          const nearest = dates.reduce((best, date) => Math.abs(Date.parse(`${date}T00:00:00Z`) - requested) < Math.abs(Date.parse(`${best}T00:00:00Z`) - requested) ? date : best, first);
          onSeek(nearest);
        }} />
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground"><span>{label(first)}</span><span className="font-sans">Collection date</span><span>{label(last)}</span></div>
    </>}
  </div>;
}
