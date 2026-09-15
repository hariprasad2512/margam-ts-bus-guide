# AGENTS.md

## Workflow
- Work only on `develop-ai`. Never commit directly to `develop` or `master`.
- Every feature/major change = Draft PR `develop-ai` → `develop`.

## Layout
- `data-pipeline/` — Python GTFS → SQLite builder. Real entrypoint: `build_db.py`.
- `mobile-client/` — Expo app (SDK `~57.0.9`, RN `0.86.2`, React `19.2.3`, TS strict). Entrypoints: `index.ts` → `App.tsx` → `src/navigation/AppNavigator.tsx` (screens: Search, RouteResults, TripTimeline, About; `headerShown: false`, custom headers).
- No monorepo tooling, no CI, no test/lint/typecheck scripts. `package.json` scripts are only `start`, `android`, `ios`, `web`.

## Commands
- Rebuild DB (run from `data-pipeline/`): `python3 build_db.py` → outputs `tgsrtc.db` in cwd. Then copy it to `mobile-client/assets/tgsrtc.db` (that copy **is** committed and is what the app ships).
- Run app (from `mobile-client/`): `npx expo start`, `npx expo start --android|--ios|--web`.
- Optional read-only check: `npx tsc --noEmit` (no script defined for it).

## Data pipeline gotchas
- `RAW_DATA_DIR = 'raw_data'` with GTFS `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`. Raw data is gitignored (`data-pipeline/raw_data/`, `*.txt/*.csv/*.zip`) — expect it locally, not in git.
- Schema is a subset of GTFS (see `build_db.py:setup_database`): `stops`, `routes`, `trips`, `stop_times` + 4 indices in `build_indices`. Script drops and recreates tables on every run.
- `venv/` is gitignored; use system `python3` (stdlib only: `sqlite3`, `csv`, `os`).

## Mobile gotchas
- Expo version pin: read `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo code (existing rule in `mobile-client/AGENTS.md` — still authoritative, do not duplicate).
- `tgsrtc.db` bundling requires both: `metro.config.js` pushes `'db'` to `assetExts`, and `app.json` lists `./assets/tgsrtc.db` under the `expo-asset` plugin. Break either and the DB silently won't ship.
- Runtime DB init (`src/db/database.ts`): copies bundled asset to `${documentDirectory}SQLite/tgsrtc.db` via `expo-file-system/legacy` using tmp-file + `moveAsync`, opens with `openDatabaseAsync(name, undefined, dir)` (name and dir separate — absolute path as name breaks), then `PRAGMA quick_check`. Follow this pattern; init is singleton-guarded against React double-mount.
- Data layer: SQL lives in `src/db/searchQueries.ts`, global state in `src/store/useSearchStore.ts` (zustand), palette in `src/theme.ts`.
- OTA/build: `app.json` uses `runtimeVersion: { policy: appVersion }` + `updates.url`; `eas.json` channels are `development`/`preview`/`production`.
