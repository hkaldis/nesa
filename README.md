# Nesa — tool inventory

A local-first web app for keeping track of the tools you own: brand, photos and
details, plus three things a spreadsheet cannot do for you.

- **Compatibility** — what fits what, including chains through adapters you own.
  "Will my 1/2" ratchet drive these 3/8" sockets?" → yes, via the Draper adapter.
- **The right tool for the next job** — pick a job and see which of your tools
  cover each step and what is missing.
- **Gaps** — holes in your sets, accessories with nothing to run them, battery
  platforms without a charger, and a ranked list of what to buy next.

Everything is stored in your browser on your device. There is no account, no
server and no network call. Photos included.

## Running it

Development is buildless. Serve the repository root with anything and reload as
you edit — browsers block storage on `file://`, so it does need a server:

```sh
npm run dev          # or: python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

`node build.js` (or `npm run build`) writes a deployable copy to `dist/`:
seventeen source files concatenated into one content-hashed bundle, hashed CSS,
and a service worker whose cache name carries the same hash. There is no
minification and no dependencies — every source file is an IIFE, so
concatenation is the whole transform and the deployed code stays readable.

```sh
npm run preview      # build, then serve dist/ on http://localhost:8001
```

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/pages.yml`. Enable it once under **Settings → Pages →
Source: GitHub Actions**. `dist/` is generated and not committed.

Then open the published URL on your phone and choose *Add to Home Screen*. It
runs offline from there, which is the point — workshops and garages rarely have
signal. Each browser and device keeps its own copy of the data; use the backup
file in Settings to move between them.

### How updates reach an installed copy

The service worker is network-first for page loads and cache-first for
everything else. Assets have content-hashed filenames so they can never go
stale, but the HTML that names them has to stay fresh — served from cache, an
installed copy would keep loading the old bundle forever. Offline, the cached
shell takes over and the app works exactly as before. Activating a new worker
deletes the previous build's cache, so old bundles do not accumulate.

## How compatibility works

Every tool declares two lists of connections:

| Field | Meaning | Example |
| --- | --- | --- |
| `accepts` | things that plug **into** it | a 1/2" ratchet accepts `drive:1/2` |
| `fits` | what it plugs **into** | a socket fits `drive:1/2` |

Two items work together when one's `accepts` and the other's `fits` share a
token. That single rule covers battery platforms, square drives, bit shanks,
SDS, grinder spindles, jigsaw blades, router collets, dust ports and air fittings.

An adapter is simply an item with both lists filled in — a 1/2"F→3/8"M adapter
accepts `drive:3/8` and fits `drive:1/2` — so the app walks the chain and tells
you *which* adapter makes the connection, up to three links deep. Nothing is
special-cased.

When you pick a category and power source, the editor suggests the connections
that item usually has, so filling this in is a few taps rather than typing tokens.

## How the gap analysis works

Four independent signals feed one ranked shopping list:

1. **Job readiness** — every job you cannot do, grouped so one purchase is
   credited with everything it unblocks. Items that are the *last* thing
   missing for a job rank highest.
2. **Compatibility** — an accessory with no host, a host with no accessories, a
   battery platform with tools but no battery or charger.
3. **Size series** — the missing 15 mm socket. Sizes come from each tool's size
   or size range, so a set entered as `8-19mm` counts as everything it spans, and
   the app reports holes *inside* the range you own plus common sizes you lack.
4. **Kit coverage** — checklists per kind of work (household, woodworking,
   automotive, electrical, plumbing, decorating, garden). Only kits you are
   already invested in are used for suggestions, so an empty kit does not nag.

Jobs match on *capabilities* ("drill masonry", "torque to spec") rather than
specific products, so swapping brands does not break anything. Fourteen job
templates ship with the app and you can add your own.

## Your data

- **Backup** (Settings) writes a single JSON file with tools, photos and custom
  jobs. Restoring merges by tool id, so re-importing your own backup does not
  create duplicates. This is the file to keep.
- **CSV** export/import covers the text fields only — useful for bulk-adding
  tools in a spreadsheet. List columns (`tags`, `capabilities`, `accepts`,
  `fits`) are pipe-separated, e.g. `drive:1/2|shank:hex-1/4`.
- **Sample inventory** (Settings) loads a realistic 46-tool workshop with
  deliberate gaps, to see the analysis working before entering your own.

Photos are downscaled to 1280 px on the way in with a separate thumbnail, so a
few hundred tools stay well inside a browser's storage quota.

## Layout

```
index.html              app shell and script order (the build reads it)
build.js                bundles and hashes into dist/ for deployment
assets/styles.css       all styling, light and dark
src/taxonomy.js         categories, connections, capabilities, kits, job templates
src/model.js            tool record: defaults, normalisation, search, CSV
src/store.js            IndexedDB (localStorage fallback)
src/photos.js           capture, resize, blob storage, export
src/compat.js           compatibility engine and adapter chaining
src/jobs.js             job planner
src/gaps.js             gap analysis and suggestions
src/ui.js               shared UI atoms
src/views/              one file per screen
src/app.js              state and hash router
sw.js                   offline cache
data/                   sample inventory
```

Vanilla JavaScript, no dependencies, no build step. Editing a file and reloading
is the whole development loop.

## Adding to the reference data

The categories, connection types, capabilities, size series, kit checklists and
job templates all live in `src/taxonomy.js` as plain arrays. Adding a battery
platform, a new job or a socket series is a few lines there — the rest of the app
picks it up automatically.
