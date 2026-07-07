# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **ERAS Tool** — a Create React App (react-scripts) single-page app for exploring patient *trajectories* from epidemiological data (built for the FinnGen sandbox). It ingests TSV/JSON of patients moving through a sequence of disease *states* over time, then visualizes them with D3, react-three-fiber (WebGL), and @xyflow/react. There is no backend; everything runs client-side, with heavy computation offloaded to Web Workers.

## Commands

```bash
npm start            # dev server (react-scripts) on :3000
npm run build        # production build → build/
npm test             # jest in watch mode (react-scripts test)
npm test -- --watchAll=false                 # run once (CI style)
npm test -- src/App.test.js                  # run a single test file
```

Lint uses the CRA-embedded ESLint (`react-app` / `react-app/jest` config in `package.json`) — there is no standalone `npm run lint`; warnings surface in the dev server / build output.

Deployment is via Docker (`Dockerfile`): multi-stage `node:20-alpine` build → `nginx:alpine` serving `build/` on port 80. The image is pushed to GCP Artifact Registry (`europe-docker.pkg.dev/finngen-sandbox-v3-containers/.../eras-tool`) and launched in-sandbox by `eras-tool.sh`.

## Architecture: the context pipeline

State flows through a **strictly ordered chain of nested Context providers** in `src/App.jsx`. Order matters — each provider consumes the ones above it. Do not reorder without tracing dependencies:

```
RawDataProvider          src/contexts/RawDataContext.jsx
  → ProcessedDataProvider   ProcessedDataContext.jsx
    → VizProvider           VizContext.jsx
      → FiltersProvider     FiltersContext.jsx
        → DerivedDataProvider  DerivedDataContext.jsx
          → ClusteringProvider ClusteringContext.jsx
            → FlowProvider     FlowContext.jsx
```

- **RawData** — holds the uploaded file text or fetched template; `loadData()` accepts a `File` or a URL string (templates live in `public/data/`). Output is raw string, not parsed.
- **ProcessedData** — parses raw text (TSV via `tsvJSON`, else `JSON.parse`; normalizes `personSourceValue` → `FINNGENID`) and runs the **core enrichment pipeline** of hooks from `src/components/hooks/useDataProcessing.js`: `useDataCleanup` → `richData`, then `useStates`, `useTrajectoriesFromData`, `useSilhouettesFromTrajectories`. This is the source of truth for the unfiltered dataset.
- **Viz** — UI state (theme, color mode, `chartType`, legend/panel toggles, a counter-based `startLoading`/`stopLoading` global spinner). Also receives `dominanceArrayFromFlow` / `nodesFromFlow` set by the FlowChart.
- **Filters** — user selections (removed states, slider ranges, selected silhouettes/trajectories/lumps). All reset on `fileName` change.
- **DerivedData** — **re-runs the same trajectory/silhouette hooks but on the filtered data**. Components that should respect filters read from here (`useDerivedData`); components showing the full dataset read from ProcessedData (`useData`). Keep this distinction straight.
- **Clustering** — feeds per-silhouette duration matrices to `newClustering.worker.js` and exposes progressive results + ranked medoids.
- **Flow** — wraps @xyflow/react node/edge state for the FlowChart import step.

Many of these contexts reset derived state via `useEffect(... , [fileName])` — loading a new file is the global "reset" signal.

## Domain model

A patient record has `FINNGENID`, `trajectory` (ordered array of state names), `SwitchEventAge` (age at each state entry), `years` (calendar dates), and `diseaseDuration`. Derived concepts you will see throughout the code:

- **State** — a single node in a trajectory (e.g. `"a"`, snake_cased on enrichment).
- **Trajectory** — one patient's ordered sequence of states; enriched into an array of *links* (`source`/`target` state with age/date/x, plus `speed` = duration between consecutive states, `lump`, `initialState`/`finalState`). The array also carries `.states` and `.typology` (states joined by `-`).
- **Silhouette** / **typology** — a group of trajectories sharing the same `typology` string. `idealSilhouettes` are user-selected reference typologies; similarity to them uses Levenshtein distance (`src/utils/levenshteinDistance.js`).
- **Lump** — trajectory links grouped by `source-target` state pair.
- ⚠️ `speed` is a misnomer: it is the **duration** between two states (see the `TODO` in `useTrajectoriesFromData`).

## Web Workers

Heavy algorithms run off the main thread in `src/utils/workers/`, each driven by a hook in `src/components/hooks/workerHooks/`:

- `newClustering.worker.js` ← `useNewClusteringWorker` — progressive per-silhouette mean-shift clustering on duration matrices; streams one result per silhouette (largest first) with `runId`-based cancellation. (The older `clustering.worker.js` / `useClusteringWorker` is being phased out.)
- `poset.worker.js` ← `usePosetWorker` — partial-order / dominance computation.
- `dbscan.worker.js` ← `useDBSCANWorker`.

When editing a worker, keep its postMessage in/out contract in sync with the consuming hook — the message shapes are documented in the worker file headers.

## Feature flags

`src/config/features.js` exports a `features` object gating major UI sections (`fileLoader`, `flowChart`, `clusters`, `dashboard`, `carousel`, `sankey`, `matrix`, `silhouettes`, `hasseDiagram`, …). Some default to `!isProd` (`debugPanel`, `matrix`) so they only show in development. Gate new experimental UI here rather than commenting code out.

## Conventions

- Components are `.jsx`; co-located `.css` files (no CSS-in-JS framework). Heavy use of `motion`/`framer-motion` for layout animation and `AnimatePresence`.
- Data-processing logic lives in hooks (`useDataProcessing.js`) and pure helpers in `src/utils/` (`po.js`, `POHelperFunctions.js`, `lumpsHelpers.js`, `cleanTrajectories.js`, `colorHelpers.js`, etc.) — prefer extending these over inlining transforms in components.
- `console.time`/`console.timeEnd` and `console.log` are used liberally as performance probes in the data pipeline; this is existing style, not stray debugging.
```
