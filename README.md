# Vidmo

Video mosaic builder -- upload an image, record short video clips, and fill each tile of a grid with the best-matching frame.

## Install

```sh
npm install
```

## Run

```sh
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Usage

1. **Upload an image** -- click "Upload Image" and select a photo.
2. **Adjust grid** -- pick a column count from the dropdown (default 8).
3. **Record clips** -- press "Record" to capture video from your camera, then "Stop" to match the best frame to an unmatched tile.
4. **View recordings** -- click any matched (green-bordered) tile to replay its video.
5. **Save / Load** -- save your progress as a `.vidmo` file and reload it later.

Repeat recording until every tile is filled.

## Tests

```sh
npm test
```

Tests use Vitest and run in Node (no browser required).

## Tech Stack

- **Vite** -- dev server and build tool
- **TypeScript** -- strict, no runtime dependencies
- **Vitest** -- unit testing
- **MediaRecorder API** -- browser video capture
- **Canvas API** -- image splitting, histogram computation, color adjustment

## Project Structure

```
src/
  main.ts            App entry point and event wiring
  state.ts           Reactive store
  types.ts           Shared type definitions
  persistence.ts     Save/load .vidmo files
  image/             Histogram, tile splitting, color adjustment
  video/             Camera recording and frame extraction
  ui/                Layout, controls, grid rendering, modal
test/                Unit tests
```
