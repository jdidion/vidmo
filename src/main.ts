import './style.css';
import { createStore } from './state';
import { createLayout } from './ui/layout';
import { onImageUpload, onGridSizeChange, updateProgress } from './ui/controls';
import { renderGrid } from './ui/grid-renderer';
import { splitImageIntoTiles } from './image/tile-splitter';

const store = createStore();

const app = document.getElementById('app')!;
const { grid, controls, header } = createLayout(app);

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

  store.update({ gridRows: rows, gridCols: cols });

  if (state.sourceImageData) {
    const tiles = splitImageIntoTiles(state.sourceImageData, rows, cols);
    store.update({
      tiles,
      completedCount: 0,
      videos: new Map(),
    });
  }
});

// Record button placeholder (Phase 4)
recordBtn.addEventListener('click', () => {
  console.log('Recording not yet implemented');
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
  recordBtn.disabled = state.phase === 'idle';

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
        // Tile click placeholder (Phase 6)
        console.log('Tile clicked:', tileId);
      },
    );
  } else {
    grid.innerHTML = '';
  }
});
