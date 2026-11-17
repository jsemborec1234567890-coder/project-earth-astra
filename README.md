# PROJECT EARTH

Open `dist/earth.html` in Edge, Chrome or Firefox with WebGL enabled. The 9.7 MB HTML includes all scripts, satellite textures, shaders, styles and license notices. No server, installation or internet connection is needed to play.

Drag to orbit, scroll to zoom and click the globe to target. Configure an intervention on the right and execute it. The focus button centers the selected coordinates. Space pauses simulation; P opens photo mode; Escape returns to orbit. One-times speed advances one model day per real second. Settings contains scenarios, quality, optional audio, fullscreen, save/load and JSON export/import. Autosave uses browser-local storage, which may be restricted for local files in some browsers; use Export world for a portable backup.

## Implemented

- Accurate mapped satellite Earth, clouds, night lights, atmosphere and stars.
- Configurable asteroid kinetic energy, approach, land deformation, ocean cavity and curved waves.
- Earthquake, volcano, supervolcano, tsunami, hurricane, wildfire, flood, drought, warming, ice age and fictional pandemic.
- Eleven sustained restoration programs and five starting scenarios.
- Twelve-region population model with births, deaths, migration, disaster casualties, environmental pressures, infrastructure and recovery.
- Time controls, history inspection, population chart, local persistence and photo capture.

## Approximation limits

This is a visually stylized sandbox, not a scientific prediction tool. The 8.2-billion population baseline and environmental indices are approximate reference values. Exposure uses twelve regional centroids rather than detailed population grids. Temperature, migration, mortality, crater scaling and coastal losses use simplified relationships. No hydrodynamics, atmospheric entry fragmentation, real bathymetry-based tsunami routing, or tectonic simulation is attempted. Clouds are a static reference texture with visual drift. Small damage features and particles are exaggerated to remain visible from orbit. Non-impact disasters use distinct parameterized effects rather than detailed local fluid/terrain solvers.

The renderer retains the latest 32 geographic visual interventions and up to 20 concurrent transient effects; the simulation keeps 160 events and 240 history samples. This bounds memory during long sessions. Visual sequences use real seconds; simulation outcomes are committed when launching an action. Rendering performance depends on GPU and viewport; use Performance quality for lower pixel density and no clouds.

## Development and checks

Source: `src/`, assets: `assets/`. Run `npm install`, `npm run build` to reproduce the single HTML. Run `npm test` for eight model tests. `node tests/browser.mjs` uses an installed Edge browser with Playwright, opens the actual `file://` release with HTTP requests blocked, exercises the principal controls and saves screenshots. Tested in Edge on Windows; other browsers have not been exercised.

Asset sources and provenance are in `ASSET_CREDITS.md`. Three.js and the three-globe example assets include MIT notices in the release HTML. No remote fonts, trackers, APIs or CDNs are used.
