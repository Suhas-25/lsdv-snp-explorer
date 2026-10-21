import { geoIdentity, geoPath } from "d3-geo";
import { useState } from "react";
import india from "@/data/india.json";
import districtsGeo from "@/data/districts.json";
import { districtCoords, districtTone, type Sample } from "@/lib/snp-data";

const W = 460, H = 500;
const fc = india as unknown as GeoJSON.FeatureCollection;
const dfc = districtsGeo as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { state: string; district: string }>;
const proj = geoIdentity().reflectY(true).fitSize([W, H], fc);
const path = geoPath(proj);
const nice = (n: string) => (n === "Orissa" ? "Odisha" : n === "Uttaranchal" ? "Uttarakhand" : n);
const districtFeature = new Map(dfc.features.map((f) => [f.properties.district, f]));
const statesWithDistricts = new Set(dfc.features.map((f) => f.properties.state));

// Where a district's sample cluster sits: the boundary's centroid, falling back to hand-entered coordinates.
function anchor(district: string): [number, number] | null {
  const f = districtFeature.get(district);
  if (f) return path.centroid(f) as [number, number];
  const c = districtCoords[district];
  return c ? (proj(c) as [number, number] | null) : null;
}

// Gentle playback zoom: never far enough to lose the outline of India, and clamped so no blank edge shows.
const ZOOM = 1.25;
function cameraFor(districts: string[] | null) {
  const boxes = (districts ?? []).flatMap((d) => {
    const f = districtFeature.get(d);
    if (f) return [path.bounds(f)];
    const p = anchor(d);
    return p ? [[p, p] as [[number, number], [number, number]]] : [];
  });
  if (!boxes.length) return { k: 1, tx: 0, ty: 0 };
  const x0 = Math.min(...boxes.map((b) => b[0][0])), x1 = Math.max(...boxes.map((b) => b[1][0]));
  const y0 = Math.min(...boxes.map((b) => b[0][1])), y1 = Math.max(...boxes.map((b) => b[1][1]));
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return { k: ZOOM, tx: clamp(W / 2 - cx * ZOOM, W - W * ZOOM, 0), ty: clamp(H / 2 - cy * ZOOM, H - H * ZOOM, 0) };
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const CLUSTER_R = 16;

// Greedy label placement: try positions around each cluster, keep the first that avoids every cluster and earlier label.
function placeLabels(points: { name: string; x: number; y: number }[]) {
  const clusters: Box[] = points.map((p) => ({ x0: p.x - CLUSTER_R, y0: p.y - CLUSTER_R, x1: p.x + CLUSTER_R, y1: p.y + CLUSTER_R }));
  const placed: Box[] = [];
  const dirs: [number, number][] = [[1, -0.6], [1, 0.6], [-1, -0.6], [-1, 0.6], [0, -1], [0, 1], [1.6, -1.4], [-1.6, -1.4], [1.6, 1.4], [-1.6, 1.4]];
  return points.map((p) => {
    const w = p.name.length * 6.4 + 4, h = 13;
    for (const dist of [24, 38, 54]) {
      for (const [dx, dy] of dirs) {
        const lx = p.x + dx * dist, ly = p.y + dy * dist;
        const box = { x0: dx < 0 ? lx - w : dx === 0 ? lx - w / 2 : lx, y0: ly - h / 2, x1: 0, y1: ly + h / 2 };
        box.x1 = box.x0 + w;
        if (clusters.some((c) => overlaps(c, box)) || placed.some((b) => overlaps(b, box))) continue;
        placed.push(box);
        return { ...p, lx, ly, anchor: (dx < 0 ? "end" : dx === 0 ? "middle" : "start") as "start" | "middle" | "end" };
      }
    }
    return { ...p, lx: p.x + 20, ly: p.y - 14, anchor: "start" as const };
  });
}

type Tip = { x: number; y: number; title: string; lines: string[] };

export function IndiaMap({ active, all, carriers, hover, onHover, focus, blink, zoomTo, onStateClick }: {
  active: boolean; all: Sample[]; carriers: Set<string>; hover: string | null; onHover: (id: string | null) => void;
  focus: string | null; blink: boolean; zoomTo: string[] | null; onStateClick: (n: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  const groups: Record<string, Sample[]> = {};
  all.forEach((s) => (groups[s.district] ??= []).push(s));
  const cam = cameraFor(zoomTo);

  const ordered = [...fc.features].sort((a, b) =>
    nice((a.properties as { NAME_1: string }).NAME_1) === hoverState ? 1 : nice((b.properties as { NAME_1: string }).NAME_1) === hoverState ? -1 : 0);

  const points = Object.keys(groups).flatMap((d) => {
    const p = anchor(d);
    return p ? [{ name: d, x: p[0], y: p[1] }] : [];
  });
  const labels = placeLabels(points);

  return (
    <div className="relative h-full overflow-hidden" onMouseLeave={() => { setTip(null); setHoverState(null); }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full overflow-visible" role="img" aria-label="India map of samples">
        <g className="map-camera" style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.k})` }}>
          <g className="map-outline pointer-events-none">
            {fc.features.map((f, i) => <path key={i} d={path(f) ?? ""} />)}
          </g>
          {ordered.map((f) => {
            const n = nice((f.properties as { NAME_1: string }).NAME_1);
            const st = all.filter((s) => s.state === n);
            const c = st.filter((s) => carriers.has(s.id)).length;
            const cls = !active || c === 0 ? "fill-muted hover:fill-accent" : n === "Maharashtra" ? "fill-mh-tint" : n === "Odisha" ? "fill-od-tint" : "fill-muted hover:fill-accent";
            return (
              <path key={n} d={path(f) ?? ""} className={`map-state ${statesWithDistricts.has(n) ? "map-state-flat" : ""} ${cls} ${focus && active && focus !== n ? "opacity-40" : ""} stroke-[0.9]`}
                onClick={() => onStateClick(n)}
                onMouseMove={(e) => {
                  setHoverState(n);
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const r = svg.getBoundingClientRect();
                  setTip({ x: e.clientX - r.left, y: e.clientY - r.top, title: n,
                    lines: st.length ? [`${st.length} samples sequenced`, active ? `${c} carry this SNP` : "Select a SNP to highlight"] : ["No samples"] });
                }} />
            );
          })}
          <g className="pointer-events-none">
            {dfc.features.map((f) => {
              const { state, district } = f.properties;
              const sampled = groups[district]?.some((s) => carriers.has(s.id)) && active;
              return (
                <path key={`${state}-${district}`} d={path(f) ?? ""} className={`map-district ${sampled ? "map-district-sampled" : ""} ${focus && active && focus !== state ? "opacity-40" : ""}`}
                  style={sampled ? { fill: districtTone(state, district) } : undefined} />
              );
            })}
          </g>
          {active && labels.map(({ name, x, y, lx, ly, anchor: ta }) => {
            const list = groups[name] ?? [];
            const state = list[0]?.state ?? "";
            const blinking = blink && list.some((sample) => carriers.has(sample.id)) && (!focus || focus === state);
            const dx = lx - x, dy = ly - y, len = Math.hypot(dx, dy) || 1;
            return (
              <g key={name} className={`pointer-events-none transition-opacity ${focus && focus !== state ? "opacity-25" : ""}`}>
                {blinking && <circle data-blinking-district={name} cx={x} cy={y} r={22} className={`district-pulse ${state === "Maharashtra" ? "stroke-mh" : "stroke-od"} fill-none stroke-2`} />}
                <line x1={x + (dx / len) * (CLUSTER_R - 4)} y1={y + (dy / len) * (CLUSTER_R - 4)} x2={lx - (dx / len) * 3} y2={ly - (dy / len) * 3} className="map-leader" />
                <text x={lx} y={ly} dy="0.35em" textAnchor={ta} className="map-label">{name}</text>
                {list.map((s, i) => {
                  const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
                  const r = list.length > 1 ? 8 : 0;
                  const has = carriers.has(s.id);
                  const col = s.state === "Maharashtra" ? "fill-mh" : "fill-od";
                  const tone = districtTone(s.state, s.district);
                  const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
                  return (
                    <g key={s.id} className="pointer-events-auto">
                      {hover === s.id && <circle cx={cx} cy={cy} r={8} className={`${col} animate-ping opacity-60`} style={{ fill: tone }} />}
                      <circle cx={cx} cy={cy} r={has ? 5.5 : 4.5}
                        className={`map-dot ${blinking && has ? "district-blink" : ""} ${hover === s.id ? "map-dot-active" : ""} ${has ? col : "fill-background"} stroke-card stroke-[1.5]`}
                        style={has ? { fill: tone } : undefined}
                        onMouseEnter={(e) => {
                          onHover(s.id);
                          const svg = e.currentTarget.ownerSVGElement;
                          if (!svg) return;
                          const rr = svg.getBoundingClientRect();
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
        </g>
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
