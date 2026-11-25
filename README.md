# LSDV Mutation Explorer

Interactive dashboard for **Level 2: mutation distribution** of Lumpy Skin Disease Virus (LSDV) in India.
Pick a mutation effect, optionally a gene, then a mutation, and see which samples carry it on a
district-level India map and a collection timeline.

This branch (`dharini-matrix`) runs on **real data**: annotated VCFs from the Dharini `snippy-fasta`
pipeline, merged into a samples × mutations matrix, with districts matched by **LGD code** to
Dharini's own district boundaries.

> Current data: 5 NCL-BAIF isolates (Maharashtra: Ahmednagar, Nashik, Pune · Odisha: Angul, Mayurbhanj),
> 273 unique mutations vs reference NC_003027.1.

---

## Features

| Feature | What it does |
|---|---|
| **Effect dropdown** | All effects, Missense, Synonymous, Frameshift, In-frame indel, Stop gained/lost, Non-coding — each with its mutation count |
| **Gene dropdown** | Genes that have mutations of the chosen effect, in genome order, with counts (e.g. `LSDV047 (1)`); "All genes" = no gene filter |
| **Mutation dropdown** | Only mutations of the chosen effect and gene, most common first (e.g. `41403 GA→G · LSDV047 · 4/5`) |
| **All [selection]** | First option in the mutation list (e.g. "All Frameshift mutations in LSDV047"): the map shows, per district, how many of those mutations its samples carry |
| **Core mutations not listed** | Mutations present in every sample are left out of all dropdowns and counts (they would light up every district); the header shows how many. They remain in `mutation_info.csv` and the matrix |
| **India map** | Dharini district shapes; carrier districts shaded, one dot per sample (filled = carries the mutation, hollow = absent) |
| **Sample tooltip** | Lab name, GenBank ID, village, district, date, presence or count, total/private mutations, effect breakdown |
| **Mutation cards** | Position, change, gene, protein change, effect, impact, carriers (n of N, %) |
| **Summary cards** | Samples carrying the selection, split by Maharashtra / Odisha (click to filter) |
| **Timeline** | Real collection dates with play / pause / reset; the map zooms to each date's districts |

**Selection flow: Effect → Gene → Mutation**

```
Effect ▼            Gene ▼                Mutation ▼
Frameshift (72)  →  All genes (45)     →  All Frameshift mutations (72)
                    LSDV047 (1)           41403 GA→G · LSDV047 · 4/5
```
- Changing the effect resets the gene to "All genes" and selects the most common mutation.
- Choosing a gene opens "All … in <gene>" (per-sample counts on the map); pick one mutation from the list to see it alone.
- "All effects" + a gene = every mutation in that gene, whatever its effect (a gene-centred view).
- Why a gene filter: to answer questions like "which samples have any change in gene X?" and to find mutations of a gene
  without scrolling the whole list. Gene names come from snpEff (`ANN` Gene_Name); non-coding mutations carry the nearest gene's name.

**Mutation classes**
- **core** – in every sample (lineage differences from the reference); not listed in the dashboard.
  "Core" depends on the sample set: with more samples many of today's core mutations become shared and will appear
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

### Matrix outputs (`lvl_2_explore/output/`) and why each exists

| File | One row per | Columns | Why we need it |
|---|---|---|---|
| `mutation_matrix.csv` | sample | `genbank_id`, then one column per mutation (`POS:REF>ALT`) with `1` = present, `0` = not found | The core result: **samples × mutations**. Input for the dashboard and for later population methods (Fisher's test, FST, PCA/clustering, Random Forest, LASSO, Isolation Forest). |
| `mutation_info.csv` | mutation | `key, chrom, pos, ref, alt, type, effect_group, effect, impact, gene, hgvs_c, protein, count, freq, class, carriers` | Describes each matrix column: what the change does (snpEff effect, impact, gene, protein), how common it is (count, freq), its class (core / shared / singleton) and who carries it. Drives the Effect, Gene and Mutation dropdowns and the mutation cards. |
| `sample_info.csv` | sample | metadata (`sample_id, state, district, LGD codes, location, sample_type, host, collection_date`) + `total_mutations, snps, indels, complex, private_mutations` | Describes each matrix row: where and when it was collected, and a per-sample summary. Places samples on the map/timeline; private (singleton) counts flag unusual samples (e.g. PP488403). |
| `sample_effect_summary.csv` | sample | `genbank_id` + one column per effect group (Missense, Synonymous, Frameshift, …) | How many mutations of each effect every sample has. Used for the effect breakdown in the map tooltip and quick comparisons between samples. |
| `explorer_data.json` | — | `meta`, `samples`, `mutations` (with carrier lists) | The above packed into one file for the website (the matrix is stored compactly as each mutation's carrier list). This is the **data contract** for the Dharini UI/API. |
| `districts.json` | district | GeoJSON with `state, state_lgd, district, district_lgd` | District shapes for the map, from Dharini's LGD boundary files, simplified so the browser loads them quickly. |

Example (current 5 samples): 273 mutations in 104 genes — core 55, shared 183, singleton 35;
Synonymous 83, Frameshift 81, Missense 56, Non-coding 40, In-frame indel 12, Stop gained/lost 1.

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
| `src/lib/snp-data.ts` | Loads `explorer_data.json`; `mutationsFor(effect, includeCore, gene)`, `genesFor(effect, includeCore)`, `effectCounts(...)`, `samplesWithSnp(...)`, district colours |
| `src/components/IndiaMap.tsx` | Map: state outlines, LGD district shapes, sample dots, labels (with counts in "All" mode), tooltips, playback zoom |
| `src/components/Timeline.tsx` | Collection timeline with playback |
| `src/lib/collection-timeline.ts` | Date grouping, filtering and playback frames (shared by timeline, map and tests) |
| `src/routes/index.tsx` | Dashboard page: Effect → Gene → Mutation selection, cards, map, timeline |
| `src/lib/*.test.ts` | Vitest tests for timeline playback and effect/gene/mutation selection |

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
- **Gene descriptions:** the Gene dropdown shows locus names (LSDV047); protein names from the GFF could be added
  in `build_matrix.py` to show e.g. `LSDV047 · <product>`.
- **Population methods** (Fisher's test, FST, PCA + clustering, Random Forest, LASSO, Isolation Forest)
  will use the same matrix.
