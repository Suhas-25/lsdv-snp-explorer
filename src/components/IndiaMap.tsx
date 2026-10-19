import { geoIdentity, geoPath } from "d3-geo";
import { useState } from "react";
import india from "@/data/india.json";
import { districtCoords, type Sample } from "@/lib/snp-data";

const W = 460, H = 500;
const fc = india as unknown as GeoJSON.FeatureCollection;
const proj = geoIdentity().reflectY(true).fitSize([W, H], fc);
const path = geoPath(proj);
const nice = (n: string) => (n === "Orissa" ? "Odisha" : n === "Uttaranchal" ? "Uttarakhand" : n);

type Tip = { x: number; y: number; title: string; lines: string[] };

export function IndiaMap({ active, all, carriers, hover, onHover, focus, onStateClick }: {
  active: boolean; all: Sample[]; carriers: Set<string>; hover: string | null; onHover: (id: string | null) => void; focus: string | null; onStateClick: (n: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  const groups: Record<string, Sample[]> = {};
  all.forEach((s) => (groups[s.district] ??= []).push(s));

  const ordered = [...fc.features].sort((a, b) =>
    nice((a.properties as { NAME_1: string }).NAME_1) === hoverState ? 1 : nice((b.properties as { NAME_1: string }).NAME_1) === hoverState ? -1 : 0);

  return (
    <div className="relative" onMouseLeave={() => { setTip(null); setHoverState(null); }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="India map of samples">
        <g className="map-outline pointer-events-none">
          {fc.features.map((f, i) => <path key={i} d={path(f) ?? ""} />)}
        </g>
        {ordered.map((f) => {
          const n = nice((f.properties as { NAME_1: string }).NAME_1);
          const st = all.filter((s) => s.state === n);
          const c = st.filter((s) => carriers.has(s.id)).length;
          const cls = !active ? "fill-muted hover:fill-accent" : n === "Maharashtra" ? "fill-mh/30" : n === "Odisha" ? "fill-od/30" : "fill-muted hover:fill-accent";
          return (
            <path key={n} d={path(f) ?? ""} className={`map-state ${cls} ${focus && active && focus !== n ? "opacity-40" : ""} stroke-[0.9]`}
              onClick={() => onStateClick(n)}
              onMouseMove={(e) => {
                setHoverState(n);
                const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setTip({ x: e.clientX - r.left, y: e.clientY - r.top, title: n,
                  lines: st.length ? [`${st.length} samples sequenced`, active ? `${c} carry this SNP` : "Select a SNP to highlight"] : ["No samples"] });
              }} />
          );
        })}
        {active && Object.entries(groups).map(([d, list]) => {
          const c = districtCoords[d];
          if (!c) return null;
          const [x, y] = proj(c)!;
          return (
            <g key={d} className={`pointer-events-none transition-opacity ${focus && focus !== list[0]?.state ? "opacity-25" : ""}`}>
              <text x={x + 14} y={y - 12} className="fill-foreground text-[11px] font-semibold">{d}</text>
              {list.map((s, i) => {
                const a = (i / list.length) * Math.PI * 2;
                const r = list.length > 1 ? 9 : 0;
                const has = carriers.has(s.id);
                const col = s.state === "Maharashtra" ? "fill-mh" : "fill-od";
                const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
                return (
                  <g key={s.id} className="pointer-events-auto">
                    {hover === s.id && <circle cx={cx} cy={cy} r={8} className={`${col} animate-ping opacity-60`} />}
                    <circle cx={cx} cy={cy} r={has ? 6 : 4.5}
                      className={`map-dot ${hover === s.id ? "map-dot-active" : ""} ${has ? col : "fill-background"} stroke-foreground/70 stroke-1`}
                      onMouseEnter={(e) => {
                        onHover(s.id);
                        const rr = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                        setTip({ x: e.clientX - rr.left, y: e.clientY - rr.top, title: s.id,
                          lines: [`${s.district}, ${s.state}`, s.date, has ? "SNP present" : "SNP absent"] });
                      }}
                      onMouseLeave={() => onHover(null)} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="map-tip pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg px-3 py-2 text-xs shadow-lg animate-in fade-in zoom-in-95"
          style={{ left: tip.x, top: tip.y }}>
          <p className="font-display font-semibold">{tip.title}</p>
          {tip.lines.map((l) => <p key={l} className="opacity-80">{l}</p>)}
        </div>
      )}
    </div>
  );
}
