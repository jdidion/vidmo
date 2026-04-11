import './style.css';
import { createStore } from './state';
import { createLayout } from './ui/layout';
import { onImageUpload, onGridSizeChange, updateProgress } from './ui/controls';
import { renderGrid } from './ui/grid-renderer';
import { splitImageIntoTiles } from './image/tile-splitter';
import { openModal } from './ui/modal';
import { startRecording } from './video/recorder';
import { findBestMatch } from './matching/matcher';
import type { RecorderHandle } from './video/recorder';

const store = createStore();

const app = document.getElementById('app')!;
const { grid, controls, preview, header } = createLayout(app);
const previewVideo = preview.querySelector<HTMLVideoElement>('video')!;

let recorderHandle: RecorderHandle | null = null;

const uploadInput = controls.querySelector<HTMLInputElement>('#image-upload')!;
const gridSelect = controls.querySelector<HTMLSelectElement>('#grid-size')!;
const recordBtn = controls.querySelector<HTMLButtonElement>('#record-btn')!;
const resetBtn = controls.querySelector<HTMLButtonElement>('#reset-btn')!;
const progressEl = header.querySelector<HTMLElement>('#progress')!;

// Wire image upload
onImageUpload(uploadInput, (img, imageData) => {
  const { gridRows, gridCols } = store.getState();
  const tiles = splitImageIntoTiles(imageData, gridRows, gridCols);
  store.update({
    sourceImage: img,
    sourceImageData: imageData,
    tiles,
    phase: 'image-loaded',
    completedCount: 0,
    videos: new Map(),
  });
});

// Wire grid size change
onGridSizeChange(gridSelect, (rows, cols) => {
  const state = store.getState();
  if (state.completedCount > 0) {
    const confirmed = window.confirm(
      'Changing grid size will reset matched tiles. Continue?',
    );
    if (!confirmed) {
      gridSelect.value = `${state.gridRows}x${state.gridCols}`;
      return;
    }
  }

  const partial: Partial<typeof state> = { gridRows: rows, gridCols: cols };
  if (state.sourceImageData) {
    partial.tiles = splitImageIntoTiles(state.sourceImageData, rows, cols);
    partial.completedCount = 0;
    partial.videos = new Map();
  }
  store.update(partial);
});

// Record button: toggle recording and run matching on stop
recordBtn.addEventListener('click', async () => {
  const state = store.getState();

  if (state.phase === 'image-loaded') {
    // Start recording
    store.update({ phase: 'recording' });
    preview.classList.remove('hidden');
    recorderHandle = await startRecording(previewVideo);
    recordBtn.textContent = 'Stop';
    recordBtn.classList.add('recording');
  } else if (state.phase === 'recording' && recorderHandle) {
    // Stop recording and match
    store.update({ phase: 'processing' });
    recordBtn.textContent = 'Matching...';
    recordBtn.disabled = true;
    preview.classList.add('hidden');
    recordBtn.classList.remove('recording');

    const video = await recorderHandle.stop();
    const currentState = store.getState();
    currentState.videos.set(video.id, video);
    store.update({ videos: currentState.videos });

    const match = await findBestMatch(video.blob, currentState.tiles);
    if (match) {
      const updatedTiles = currentState.tiles.map((tile) =>
        tile.id === match.tileId
          ? {
              ...tile,
              matched: true,
              matchedVideoId: video.id,
              matchedFrameData: match.frame.imageData,
            }
          : tile,
      );
      store.update({
        tiles: updatedTiles,
        completedCount: currentState.completedCount + 1,
      });
    }

    store.update({ phase: 'image-loaded' });
    recordBtn.disabled = false;
    recordBtn.textContent = 'Record';
    recorderHandle = null;
  }
});

// Reset button
resetBtn.addEventListener('click', () => {
  const state = store.getState();
  // Revoke all object URLs
  state.videos.forEach((video) => {
    URL.revokeObjectURL(video.objectUrl);
  });
  store.reset();
  gridSelect.value = '8x8';
});

// Subscribe to state changes
store.subscribe((state) => {
  // Update record button state
  recordBtn.disabled = state.phase === 'idle' || state.phase === 'processing';

  // Update progress
  updateProgress(progressEl, state.completedCount, state.tiles.length);

  // Render grid when we have image data and tiles
  if (state.sourceImageData && state.tiles.length > 0) {
    renderGrid(
      grid,
      state.tiles,
      state.gridCols,
      state.sourceImageData,
      (tileId) => {
        const s = store.getState();
        const tile = s.tiles.find((t) => t.id === tileId);
        if (tile?.matched && tile.matchedVideoId) {
          const video = s.videos.get(tile.matchedVideoId);
          if (video) {
            openModal(video.objectUrl);
          }
        }
      },
    );
  } else {
    grid.innerHTML = '';
  }
});
