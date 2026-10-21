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
  return <div className="space-y-1">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" disabled={!first} aria-label={playing ? "Pause timeline" : complete ? "Replay timeline" : "Play timeline"} title={playing ? "Pause" : "Play"} onClick={onPlayPause}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button type="button" size="icon" variant="outline" disabled={!first} aria-label="Reset timeline" title="Reset timeline" onClick={onRestart}><RotateCcw /></Button>
        <span className="ml-2 font-mono text-sm font-semibold text-foreground" aria-live="polite">{selectedDate ? label(selectedDate) : "All collection dates"}</span>
        {complete && <span className="text-xs text-muted-foreground">Complete</span>}
      </div>
    </div>
    {!scale || !first || !last ? <p className="py-6 text-center text-sm text-muted-foreground">{hits.length ? "No collection dates available." : "Select a SNP with carrier samples to play the timeline."}</p> : <>
      <div className="overflow-x-auto pt-4">
        <div className="mx-6 min-w-[680px]">
        <div className="relative h-11" role="img" aria-label="Collection timeline with samples positioned by collection date">
          {scale.months.map((date) => <div key={date} className="pointer-events-none absolute top-0 h-6 border-l border-dashed border-border" style={{ left: `${scale.position(date)}%` }}>
            <span className="absolute top-7 left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{monthLabel(date)}</span>
          </div>)}
          <div className="absolute inset-x-0 top-6 h-px bg-border" />
          {events.map(([date, group]) => <span key={date} title={`${group.length} sample${group.length > 1 ? "s" : ""} · ${label(date)}`} className={`absolute bottom-[calc(100%-1.5rem)] -translate-x-1/2 font-mono text-xs font-semibold text-foreground ${selectedDate && selectedDate !== date ? "opacity-35" : ""} ${selectedDate === date ? "text-primary" : ""}`} style={{ left: `${scale.position(date)}%` }}>{group.length}</span>)}
          <div className="pointer-events-none absolute top-0 h-7 w-px bg-primary" style={{ left: `${scale.positionTime(time)}%` }}>
            <span className="absolute -top-3 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-primary" />
          </div>
        </div>
        <input type="range" className="timeline-slider mt-3 w-full" aria-label="Playback time" aria-valuetext={selectedDate ? label(selectedDate) : label(first)} min={scale.start} max={scale.end} step={86400000} value={time} disabled={dates.length < 2}
          onChange={(event) => {
            const requested = Number(event.target.value);
            const nearest = dates.reduce((best, date) => Math.abs(Date.parse(`${date}T00:00:00Z`) - requested) < Math.abs(Date.parse(`${best}T00:00:00Z`) - requested) ? date : best, first);
            onSeek(nearest);
          }} />
        </div>
      </div>
    </>}
  </div>;
}
