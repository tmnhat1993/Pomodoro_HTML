# Podoromo Changelog

## 2026-06-21

### Layout Framing

- The app is now framed as a single 1920:900 stage.
- Any extra viewport space outside that stage is black letterboxing.
- Main information elements now sit inside the stage instead of being fixed to the browser viewport:
  - logo
  - tomato timer
  - digital clock
  - controls
  - todo panel
  - toast/debug controls
- Settings and debug dialogs are constrained by the stage dimensions.

### Mobile Notice

- Mobile and coarse-pointer viewports now show a popup explaining that Podoromo works best on desktop browsers.
- The message thanks the user for visiting and can be dismissed with one button.

### Daily Cycle Counter

- Added a per-device daily Podoromo cycle counter.
- A completed focus + break cycle increments the counter by 1 when the break session finishes.
- The count is stored in `localStorage` under `podoromo:daily-cycles` and resets automatically when the local calendar date changes.
- The control card now shows today's completed cycle count.

### Preset Management

- Timer presets are now persisted in `localStorage` under `podoromo:presets`.
- Default presets can be deleted by the user.
- A restore defaults action brings the original preset list back.
- Custom time entry is hidden behind the `Add your custom time` button.
- Saving custom time creates a remembered preset with focus, short break, long break, and cycle settings.

### Percentage-Based Scene Layout

- Scene/art elements now use percentages of the 1920:900 app stage instead of browser viewport units.
- The tomato timer position and size are percentage-based:
  - `left: 24.479%`
  - `bottom: 8.444%`
  - `width: 25.573%`
- Timer text inside the tomato scales from the tomato canvas container.
- Timer and logo debug values now use app-canvas percentages, while clock, controls, and todo keep pixel values.
- Clock, control information, and todo list retain fixed pixel sizing.
- Layout debug storage was versioned to `podoromo:debug-layout-v2` so older pixel overrides do not affect the new percentage defaults.
- Layout debug storage was versioned again to `podoromo:debug-layout-v3` so older pixel timer/logo overrides cannot make canvas-scaled elements oversized.

### Canvas Scene Renderer

- Graphics scene rendering moved from stacked `<img>` elements to a single canvas renderer.
- HTML remains responsible for interactive/info elements such as timer text, clock, controls, and todo list.
- The canvas currently preserves the existing visual order:
  - weather/background layer
  - room foreground layer
- This prepares the scene for complex future animation such as rain, snow, day/night light, and window-only outside weather effects.

### Canvas Tomato Timer

- The tomato timer body and its internal timer text now render together in a dedicated canvas.
- The timer remains controlled by the existing timer store/view logic, while the visual body, mode label, countdown, and status draw as one graphic element.
- Clock, controls, settings, and todo remain HTML.

### Window Mask Debug

- Added, used, then removed the fixed bottom debug bar for measuring the window mask rectangle.
- Final measured values were applied to create the cutout foreground asset.

### Window Cutout Foreground

- Added `public/scene/room-foreground-window-cutout-v2.png`.
- Added `public/scene/room-foreground-window-manual-edit.png` from the project-root manual edit file and switched the canvas renderer to use it.
- The new foreground is based on the current cozy room composition but removes the baked outside sunlight beam.
- Window openings are transparent so weather/background layers render behind the frame.
- The cutout was created from the measured app-canvas mask:
  - `x: 43%`
  - `y: 0%`
  - `width: 40%`
  - `height: 55.77%`
- The canvas scene renderer now uses this cutout foreground.

## 2026-06-20

### Current State

- Built the Podoromo MVP as a Vite + TypeScript + SCSS app.
- Timer, presets, custom durations, todo list, localStorage, tab title updates, toast, sound toggle, notification toggle, and digital clock are implemented.
- App runs at `http://127.0.0.1:5173/`.
- `npm run build` passes.

### Visual Direction

- The app is now using raster PNG assets for the illustrated scene instead of SVG or CSS/vector-style object drawing.
- The main room artwork is split into two aligned image layers:
  - `public/scene/room-foreground-window-open.png`
  - `public/scene/weather/weather-current.png`
- The foreground image has transparent window panes so dynamic weather layers can be swapped behind it later.
- A sample alternate weather layer exists:
  - `public/scene/weather/weather-rain-night.png`
- The tomato timer body is a transparent PNG:
  - `public/scene/assets/timer-body.png`
- Logo and favicon assets are PNG:
  - `public/brand/podoromo-wordmark.png`
  - `public/icons/podoromo-logo-*.png`

### Layout Changes

- Main controls were simplified into a compact control card.
- Timer settings were moved into a modal dialog:
  - presets
  - custom focus/short/long/cycle durations
  - sound toggle
  - browser notification toggle
- Todo list is fixed at the bottom-right on desktop.
- Digital clock is fixed at the top-right.
- On mobile, todo remains a bottom drawer to avoid covering the timer.

### Important Files

- `src/app.ts` - main DOM structure and wiring.
- `src/styles/scene.scss` - background, foreground, timer, and clock positioning.
- `src/styles/controls.scss` - control card and settings modal.
- `src/styles/todo.scss` - todo panel and drawer styles.
- `src/styles/responsive.scss` - tablet/mobile layout.
- `src/modules/timer/*` - timer store/controller/view.
- `src/modules/todo/*` - todo store/view.
- `src/modules/scene/scene-theme.ts` - scene theme and weather layer switching.

### Notes For Next Session

- Keep illustrated assets as PNG raster images. Do not reintroduce SVG or CSS-drawn illustration objects.
- CSS should primarily handle layout, panels, controls, and responsiveness.
- Future weather work should add new PNG layers behind `room-foreground-window-open.png` and switch them through `setWeatherLayer(...)`.
- The current modal layout is the preferred direction for settings; avoid putting settings back into the bottom control card.

### Suggested Next Tasks

- Add real weather modes: sunny, cloudy, rainy, night.
- Add a small weather selector inside the settings modal for testing.
- Polish mobile spacing around the timer, controls, and todo drawer.
- Add keyboard shortcut hints in documentation only, not visible in the main UI.
