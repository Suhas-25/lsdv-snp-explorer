import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { districtTone, type Sample } from "@/lib/snp-data";

type Row = { lgd: string; name: string; state: string; samples: number; carriers: number; mutations: number };
type StateGroup = { state: string; rows: Row[]; samples: number; carriers: number };

// Show a search box once the list gets long.
const SEARCH_FROM = 12;

// Side panel next to the map: districts grouped by state (collapsible), carriers first,
// with "carrier samples / samples" per district. Grows downward and scrolls, so it stays
// readable as more districts and states are added. Click a district to zoom the map to it.
export function DistrictPanel({ all, carriers, counts, active, focus, selected, onSelect, onHover, className = "" }: {
  all: Sample[]; carriers: Set<string>; counts: Map<string, number> | null; active: boolean;
  focus: string | null; selected: string | null;
  onSelect: (lgd: string | null) => void; onHover: (lgd: string | null) => void; className?: string;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const groups = useMemo<StateGroup[]>(() => {
    const byState = new Map<string, Map<string, Row>>();
    for (const s of all) {
      const rows = byState.get(s.state) ?? new Map<string, Row>();
      byState.set(s.state, rows);
      const r = rows.get(s.districtLgd) ?? { lgd: s.districtLgd, name: s.district, state: s.state, samples: 0, carriers: 0, mutations: 0 };
      r.samples += 1;
      if (active && carriers.has(s.id)) r.carriers += 1;
      r.mutations += counts?.get(s.id) ?? 0;
      rows.set(s.districtLgd, r);
    }
    return [...byState].map(([state, m]) => {
      const rows = [...m.values()].sort((a, b) => b.carriers - a.carriers || a.name.localeCompare(b.name));
      return { state, rows, samples: rows.reduce((n, r) => n + r.samples, 0), carriers: rows.reduce((n, r) => n + r.carriers, 0) };
    }).sort((a, b) => b.carriers - a.carriers || a.state.localeCompare(b.state));
  }, [all, carriers, counts, active]);

  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const q = query.trim().toLowerCase();
  const toggle = (state: string) => setClosed((c) => {
    const next = new Set(c);
    if (next.has(state)) next.delete(state); else next.add(state);
    return next;
  });

  return (
    <aside className={`flex min-h-0 flex-col rounded-lg border border-border/70 bg-card text-sm ${className}`} aria-label="Districts">
      <div className="border-b border-border/70 px-3 py-2">
        <p className="font-display text-sm font-semibold text-foreground">Districts</p>
        <p className="text-[11px] text-muted-foreground">
          carrier samples / samples{counts ? " · n = mutations" : ""} · click to zoom
        </p>
        {total >= SEARCH_FROM && (
          <label className="mt-2 flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find district"
              className="w-full bg-transparent text-xs outline-none" />
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {groups.map((g) => {
          const rows = q ? g.rows.filter((r) => r.name.toLowerCase().includes(q)) : g.rows;
          if (q && !rows.length) return null;
          const open = q !== "" || !closed.has(g.state);
          const dim = focus && focus !== g.state;
          return (
            <div key={g.state} className={`mb-1 transition-opacity ${dim ? "opacity-40" : ""}`}>
              <button type="button" onClick={() => toggle(g.state)} aria-expanded={open}
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left font-medium text-foreground hover:bg-muted">
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: districtTone(g.state) }} />
                <span className="flex-1 truncate">{g.state}</span>
                <span className="font-mono text-xs text-muted-foreground">{g.carriers}/{g.samples}</span>
              </button>
              {open && (
                <ul className="ml-4">
                  {rows.map((r) => {
                    const has = r.carriers > 0;
                    const isSel = selected === r.lgd;
                    return (
                      <li key={r.lgd}>
                        <button type="button" onClick={() => onSelect(isSel ? null : r.lgd)}
                          onMouseEnter={() => onHover(r.lgd)} onMouseLeave={() => onHover(null)} aria-pressed={isSel}
                          className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs hover:bg-muted ${isSel ? "bg-primary/10 font-semibold" : ""} ${has ? "text-foreground" : "text-muted-foreground"}`}>
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${has ? "" : "border border-foreground/50 bg-background"}`}
                            style={has ? { background: districtTone(r.state) } : undefined} />
                          <span className="flex-1 truncate" title={r.name}>{r.name}</span>
                          <span className="font-mono">
                            {r.carriers}/{r.samples}
                            {counts && <span className="text-primary"> · {r.mutations}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {q && groups.every((g) => !g.rows.some((r) => r.name.toLowerCase().includes(q))) && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No district matches “{query}”.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-foreground/60" />{counts ? "has ≥1 mutation" : "carries mutation"}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-foreground/50 bg-background" />{counts ? "none" : "absent"}</span>
      </div>
    </aside>
  );
}
