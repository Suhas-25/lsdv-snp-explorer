import { useState } from "react";
import type { Sample } from "@/lib/snp-data";

type Hit = Sample & { status: string };
const DAY = 86400000;
const mKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const mLabel = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

export function Timeline({ hits, hover, onHover }: { hits: Hit[]; hover: string | null; onHover: (id: string | null) => void }) {
  const [tip, setTip] = useState<{ x: number; text: string[] } | null>(null);
  if (!hits.length) return <p className="py-10 text-center text-sm text-muted-foreground">Select a SNP to see when its carrier samples were collected.</p>;

  const times = hits.map((h) => new Date(h.date).getTime());
  const first = new Date(Math.min(...times)), last = new Date(Math.max(...times));
  const start = new Date(first.getFullYear(), first.getMonth() - 1, 1);
  const end = new Date(last.getFullYear(), last.getMonth() + 2, 1);
  const months: Date[] = [];
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  const span = end.getTime() - start.getTime();
  const pct = (t: number) => ((t - start.getTime()) / span) * 100;

  const counts = new Map<string, { MH: number; OD: number }>();
  hits.forEach((h) => {
    const k = mKey(new Date(h.date)); const e = counts.get(k) ?? { MH: 0, OD: 0 };
    h.state === "Maharashtra" ? e.MH++ : e.OD++; counts.set(k, e);
  });
  const max = Math.max(1, ...[...counts.values()].map((v) => v.MH + v.OD));

  const byDate = new Map<string, Hit[]>();
  hits.forEach((h) => byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]));
  const spanDays = Math.round((last.getTime() - first.getTime()) / DAY);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="chip">First: <b>{first.toLocaleDateString("en-GB")}</b></span>
        <span className="chip">Latest: <b>{last.toLocaleDateString("en-GB")}</b></span>
        <span className="chip">Span: <b>{spanDays} days</b></span>
        <span className="chip">Collection events: <b>{byDate.size}</b></span>
      </div>

      {/* Monthly bars */}
      <div className="relative">
        <div className="flex h-44 items-end gap-1 border-b border-border">
          {months.map((m) => {
            const v = counts.get(mKey(m)) ?? { MH: 0, OD: 0 }; const t = v.MH + v.OD;
            return (
              <div key={mKey(m)} className="group flex h-full flex-1 flex-col items-center justify-end"
                onMouseEnter={(e) => t && setTip({ x: e.currentTarget.offsetLeft + e.currentTarget.offsetWidth / 2, text: [mLabel(m), `Maharashtra: ${v.MH}`, `Odisha: ${v.OD}`] })}
                onMouseLeave={() => setTip(null)}>
                {t > 0 && <span className="mb-1 font-mono text-xs font-semibold text-foreground">{t}</span>}
                <div className="bar-pop flex w-full max-w-12 flex-col overflow-hidden rounded-t-md" style={{ height: `${(t / max) * 80}%` }}>
                  {v.OD > 0 && <div className="bg-od" style={{ flex: v.OD }} />}
                  {v.MH > 0 && <div className="bg-mh" style={{ flex: v.MH }} />}
                </div>
                {t === 0 && <div className="h-1 w-full max-w-12 rounded bg-muted" />}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 pt-2">
          {months.map((m) => <div key={mKey(m)} className="flex-1 text-center font-mono text-[10px] text-muted-foreground">{mLabel(m)}</div>)}
        </div>
        {tip && (
          <div className="map-tip pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg px-3 py-2 text-xs shadow-lg" style={{ left: tip.x }}>
            {tip.text.map((l, i) => <p key={l} className={i ? "opacity-80" : "font-semibold"}>{l}</p>)}
          </div>
        )}
      </div>

      {/* Sample point timeline */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Individual samples</p>
        <div className="relative h-24 rounded-lg bg-muted/60">
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          {[...byDate.entries()].map(([d, list]) => {
            const left = pct(new Date(d).getTime());
            return (
              <div key={d} className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col-reverse items-center gap-1" style={{ left: `${left}%` }}>
                {list.map((s) => (
                  <button key={s.id} type="button" aria-label={s.id}
                    onMouseEnter={() => onHover(s.id)} onMouseLeave={() => onHover(null)}
                    className={`tl-dot ${s.state === "Maharashtra" ? "bg-mh" : "bg-od"} ${hover === s.id ? "tl-dot-active" : ""}`} />
                ))}
                <span className="absolute top-full mt-6 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </div>
            );
          })}
        </div>
        {hover && hits.find((h) => h.id === hover) && (() => { const h = hits.find((x) => x.id === hover)!; return (
          <p className="mt-8 text-xs text-muted-foreground"><b className="text-foreground">{h.id}</b> · {h.district}, {h.state} · {h.date} · {h.type}</p>
        ); })()}
      </div>
    </div>
  );
}
