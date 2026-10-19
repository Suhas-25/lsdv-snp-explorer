import { geoIdentity, geoPath } from "d3-geo";
import india from "@/data/india.json";
import { districtCoords, type Sample } from "@/lib/snp-data";

const W = 460, H = 500;
const fc = india as unknown as GeoJSON.FeatureCollection;
const proj = geoIdentity().reflectY(true).fitSize([W, H], fc);
const path = geoPath(proj);
const isMH = (n: string) => n === "Maharashtra";
const isOD = (n: string) => n === "Orissa" || n === "Odisha";

export function IndiaMap({ all, carriers }: { all: Sample[]; carriers: Set<string> }) {
  const groups: Record<string, Sample[]> = {};
  all.forEach((s) => (groups[s.district] ??= []).push(s));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="India map of samples">
      {fc.features.map((f, i) => {
        const n = (f.properties as { NAME_1: string }).NAME_1;
        const cls = isMH(n) ? "fill-mh/25 stroke-mh" : isOD(n) ? "fill-od/25 stroke-od" : "fill-muted stroke-border";
        return <path key={i} d={path(f) ?? ""} className={`${cls} stroke-[0.7]`} />;
      })}
      {Object.entries(groups).map(([d, list]) => {
        const c = districtCoords[d];
        if (!c) return null;
        const [x, y] = proj(c)!;
        return (
          <g key={d}>
            {list.map((s, i) => {
              const a = (i / list.length) * Math.PI * 2;
              const r = list.length > 1 ? 9 : 0;
              const has = carriers.has(s.id);
              const col = s.state === "Maharashtra" ? "fill-mh" : "fill-od";
              return (
                <circle key={s.id} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={has ? 6 : 4.5}
                  className={`${has ? col : "fill-background"} stroke-foreground/70 stroke-1 transition-all duration-300`}>
                  <title>{`${s.id} · ${s.district}, ${s.state}${has ? " · SNP present" : " · SNP absent"}`}</title>
                </circle>
              );
            })}
            <text x={x + 14} y={y - 12} className="fill-foreground text-[11px] font-semibold">{d}</text>
          </g>
        );
      })}
    </svg>
  );
}
