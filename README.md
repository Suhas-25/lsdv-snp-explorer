# LSDV Mutation Explorer

Interactive dashboard for **Level 2: mutation distribution** of Lumpy Skin Disease Virus (LSDV) in India.
Pick a mutation effect, then a mutation, and see which samples carry it on a district-level India map,
a collection timeline, and a sample table.

This branch (`dharini-matrix`) runs on **real data**: annotated VCFs from the Dharini `snippy-fasta`
pipeline, merged into a samples × mutations matrix, with districts matched by **LGD code** to
Dharini's own district boundaries.

> Current data: 5 NCL-BAIF isolates (Maharashtra: Ahmednagar, Nashik, Pune · Odisha: Angul, Mayurbhanj),
> 273 unique mutations vs reference NC_003027.1.

---

## Features

| Feature | What it does |
|---|---|
| **Effect dropdown** | Missense, Synonymous, Frameshift, In-frame indel, Stop gained/lost, Non-coding — each with its mutation count |
| **Mutation dropdown** | Only mutations of the chosen effect, most common first (e.g. `6621 C→A · LSDV010 · 4/5`) |
| **All [effect]** | First option in the mutation list: the map shows, per district, how many mutations of that effect its samples carry |
| **Include core** | Core mutations (present in every sample) are hidden by default, since they light up every district |
| **India map** | Dharini district shapes; carrier districts shaded, one dot per sample (filled = carries the mutation, hollow = absent) |
| **Sample tooltip** | Lab name, GenBank ID, village, district, date, presence or count, total/private mutations, effect breakdown |
| **Mutation cards** | Position, change, gene, protein change, effect, impact, carriers (n of N, %), class |
| **Summary cards** | Samples carrying the selection, split by Maharashtra / Odisha (click to filter) |
| **Timeline** | Real collection dates with play / pause / reset; the map zooms to each date's districts |
| **Table** | Sample ID + GenBank ID, state, district, village, date, status or count |

**Mutation classes**
- **core** – in every sample (lineage differences from the reference)
- **shared** – in some samples (the informative ones)
- **singleton** – in one sample only (new mutation or possible artefact)

---

## Where the data comes from

The data files in `src/data/` are **generated** by Python scripts in the separate working folder
`LSDV_Project/spatial/lvl_2_explore/` (pandas + openpyxl, no bioinformatics tools needed):

```
Dharini snippy-fasta run per sample ──► <GenBankID>_annotated.vcf
NCBI_41Samples_NCL_with_LGD.xlsx  ─┐
NCBI_41Samples_metadata.xlsx      ─┴─► build_metadata.py      ─► data/processed/metadata.csv
annotated VCFs + metadata.csv       ─► build_matrix.py        ─► output/mutation_matrix.csv, mutation_info.csv,
                                                                  sample_info.csv, sample_effect_summary.csv
matrix outputs                      ─► build_explorer_json.py ─► output/explorer_data.json   → src/data/
Dharini boundaries/<stateLGD>.json  ─► build_map_districts.py ─► output/districts.json       → src/data/
```

| Script | Does |
|---|---|
| `build_metadata.py` | Joins the LGD sheet and the NCBI sheet on **GenBank ID**; dates → `YYYY-MM-DD`; adds state/district names from the Dharini map files; warns about missing dates or unknown LGD codes |
| `build_matrix.py` | Reads each annotated VCF, keys mutations as `POS:REF>ALT`, takes effect / impact / gene / protein from snpEff `ANN` (first = most severe), builds the 1/0 matrix, counts, frequency and class |
| `build_explorer_json.py` | Packages samples + mutations (with carrier lists) into one JSON for the UI |
| `build_map_districts.py` | Extracts the districts of every sampled state from Dharini's boundary files, simplifies them (ogr2ogr) |

**Matching rules**
- Samples are identified by **GenBank ID without version** (`PP488409`), never by entry number.
- Districts are matched by **LGD code**, not name (e.g. Angul = "Anugul" in the map, code 344).
- Matrix value `0` means "not found in the VCF" (not yet "confirmed reference"; see Limitations).

### Data files used by the app

| File | Contents |
|---|---|
| `src/data/explorer_data.json` | `meta` (reference, counts, effect groups), `samples` (metadata + mutation and effect counts), `mutations` (annotation, count, freq, class, carriers) |
| `src/data/districts.json` | District boundaries (GeoJSON) for the sampled states, properties `state`, `state_lgd`, `district`, `district_lgd` — source: Dharini `web/public/data/boundaries/` |
| `src/data/india.json` | India state outlines (DataMeet, official Survey of India boundary) |

---

## Updating the data (e.g. more samples)

1. Run the new samples through Dharini `snippy-fasta`; save each as
   `lvl_2_explore/data/raw/vcf/<GenBankID>/<GenBankID>_annotated.vcf`.
2. Add their rows to the metadata sheets (with LGD codes and collection date).
3. In `lvl_2_explore/`:
   ```sh
   python scripts/build_metadata.py
   python scripts/build_matrix.py
   python scripts/build_explorer_json.py
   python scripts/build_map_districts.py      # only if a new state is added
   ```
4. Copy `output/explorer_data.json` (and `output/districts.json` if rebuilt) into `src/data/`.
5. `npm test` — some tests check specific samples and will need updating for new data.

---

## Code layout

| Path | Role |
|---|---|
| `src/lib/snp-data.ts` | Loads `explorer_data.json`; `mutationsFor(effect, includeCore)`, `effectCounts(...)`, `samplesWithSnp(...)`, district colours |
| `src/components/IndiaMap.tsx` | Map: state outlines, LGD district shapes, sample dots, labels (with counts in "All" mode), tooltips, playback zoom |
| `src/components/Timeline.tsx` | Collection timeline with playback |
| `src/lib/collection-timeline.ts` | Date grouping, filtering and playback frames (shared by timeline, map and tests) |
| `src/routes/index.tsx` | Dashboard page: Effect → Mutation selection, cards, map, timeline, table |
| `src/lib/*.test.ts` | Vitest tests for timeline playback and effect/mutation selection |

---

## Development

Requires Node.js and npm.

```sh
npm install --legacy-peer-deps
npm run dev        # local site (Vite)
npm test           # unit tests
npm run build      # production build
```

### Running the site on your own computer

```sh
cd lsdv-snp-explorer
git checkout dharini-matrix     # this version; `main` is the older demo
npm install --legacy-peer-deps  # first time only
npm run dev
```

The terminal prints a local link, usually **http://localhost:5173/** (another port if 5173 is busy,
e.g. `npm run dev -- --port 5191`). Open it in a browser.

- Keep that terminal open while using the site; **Ctrl + C** stops it.
- `localhost` works only on your own computer; it cannot be shared.
- Restarting the computer stops the site; run `npm run dev` again.

### Sharing it with others

1. Push the branch: `git push`.
2. Vercel builds every pushed branch. Open **Vercel → project → Deployments** and find the
   deployment for `dharini-matrix`.
3. Share its **preview link**; it works from any computer.

`main` is the live demo link. Branches like `dharini-matrix` get their own preview link until they
are merged into `main`. The project is also connected to Lovable.

---

## Limitations / next steps

- **Missing vs reference:** a mutation absent from a VCF is recorded as `0`. Gaps in a genome would
  also give `0`; adding Snippy's `snps.aligned.fa` would allow a third "no data" value.
- **QC report** (e.g. flagging low-variant samples such as PP488403, 83 variants vs ~220) is planned.
- **Sub-district (taluka) mapping:** Dharini's boundary files include taluka shapes keyed by sub-district
  LGD code; needs sub-district codes in the metadata.
- **Population methods** (Fisher's test, FST, PCA + clustering, Random Forest, LASSO, Isolation Forest)
  will use the same matrix.
