# Handoff: Photos, and a 2020 TV

Notes for whoever picks this fork up next. It builds on
[NelsonEU/arn0-tv](https://github.com/NelsonEU/arn0-tv); read the main [README](../README.md) first.

## What this fork adds

- **Photos screen** ([`src/js/gallery.js`](../src/js/gallery.js)). A Photos tile after All apps
  opens a grid of the wallpaper photos. OK views one full screen, Left/Right browse, OK again runs
  a 10 s slideshow, Green sets the photo as the Home background, Back returns to the grid. The
  README's "Photos" section has the details.
- **[`scripts/prepare-wallpapers.mjs`](../scripts/prepare-wallpapers.mjs)** also writes an
  uncropped, unscrimmed copy of each photo to `src/img/wallpapers/full/` for the viewer, makes
  384x216 thumbnails from a clean crop, and keeps the original file name as the caption.
- **Older-engine spacing.** Flex rows are spaced with margins instead of flex `gap`, which 2020
  TVs ignore. See the note at the top of [`src/css/style.css`](../src/css/style.css).

## Our TV

| | |
| --- | --- |
| Model | UN58TU690TFXZA (Samsung TU690T, 2020, US) |
| Firmware | T-KSU2EAKUC-2301.1 |
| Platform | Tizen 5.5; web engine about Chromium 69 |
| Status | Installed with Apps2Samsung and opens from the Apps list |

Not yet checked on the TV: the Lab render probe (Blue key), how smooth the slideshow crossfades
are, and the HDMI tiles.

**The Home-button helper is not used and should stay that way on this TV.** Its firmware guard
refuses anything but the author's Q70B firmware, and the settings it changes were only mapped on
Tizen 6.5. Open the launcher from the Apps list instead.

## Working on it

- **Preview:** `npm run preview` (Node 20+). Without Node,
  `python3 -m http.server 8080 --directory src` works too, but it lets the browser cache CSS, so
  hard-refresh after edits.
- **Build:** `npm run build` writes `dist/arn0-launcher.wgt`. Without Node, run the `zip` line
  from [`scripts/build.sh`](../scripts/build.sh) by hand; the brand tiles in `src/img/tiles/` are
  already built.
- **Install:** on the TV, open Apps, type `1 2 3 4 5`, switch Developer Mode on with the
  installing computer's IP as Host PC IP, then fully power-cycle (unplug for 30 s). The Apps
  title then reads "Apps (DEVELOP MODE)". In Apps2Samsung, pick the TV, choose **Custom WGT /
  TPK** (last item in the App dropdown), select the `.wgt` with the folder button, then
  **Download & Install**.
- **Updating:** install the new `.wgt` the same way from the same Apps2Samsung setup, so the
  signing certificate matches. Uninstalling first clears the launcher's saved settings.
- **Engine limits:** Chromium 69 has grid and grid `gap`, but not flex `gap` (84), `clamp()` /
  `min()` / `max()` (79), `aspect-ratio`, `inset`, `?.` or `??` (80). Keep the JavaScript ES5
  like the rest. The browser preview runs a newer engine, so it will not catch these.

## Open items

1. **Our own photos.** Put them in a folder and run
   `node scripts/prepare-wallpapers.mjs <folder>` (needs Node, Google Chrome and macOS `sips`).
   It replaces the bundled Unsplash set and `src/js/wallpapers.js`; then rebuild and reinstall.
   File names become captions, so name them for display.
2. **Config.** [`src/js/config.js`](../src/js/config.js) still has the original author's apps,
   consoles (Switch 2, PS5, Xbox on HDMI 1/2/4) and `en-GB` locale. Change them there, or in
   Settings on the TV.
3. **Photos without reinstalling.** Photos are bundled into the `.wgt`, so changing them means
   a rebuild and reinstall. Loading them over Wi-Fi from a computer or NAS would avoid that; the
   manifest already has the `internet` privilege and `<access origin="*">`.
4. **Dim sample thumbnails.** The bundled Unsplash thumbnails were cut from the darkened
   wallpapers before this fork existed. Regenerating from the original photos (or switching to
   our own) fixes it, and also gives the viewer its clean full-size copies.
