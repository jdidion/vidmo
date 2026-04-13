import './style.css';
import { createStore } from './state';
import { createLayout } from './ui/layout';
import { onImageUpload, onGridSizeChange, updateProgress } from './ui/controls';
import { renderGrid } from './ui/grid-renderer';
import { splitImageIntoTiles, computeSquareGrid } from './image/tile-splitter';
import { openModal } from './ui/modal';
import { saveMosaic, loadMosaic } from './persistence';
import { startRecording } from './video/recorder';
import { findBestMatch } from './matching/matcher';
import type { RecorderHandle } from './video/recorder';
import type { RecordedVideo } from './types';

const store = createStore();

const app = document.getElementById('app')!;
const { grid, controls, preview, header } = createLayout(app);
const previewVideo = preview.querySelector<HTMLVideoElement>('video')!;

let recorderHandle: RecorderHandle | null = null;

// Processing progress bar
const progressBar = document.createElement('div');
progressBar.className = 'progress-bar hidden';
progressBar.innerHTML = '<div class="progress-bar-label"></div><div class="progress-bar-track"><div class="progress-bar-fill"></div></div>';
app.insertBefore(progressBar, grid);

function showProgress(stage: string, fraction: number) {
  progressBar.classList.remove('hidden');
  progressBar.querySelector('.progress-bar-label')!.textContent = stage;
  (progressBar.querySelector('.progress-bar-fill') as HTMLElement).style.width = `${Math.round(fraction * 100)}%`;
}

function hideProgress() {
  progressBar.classList.add('hidden');
}

function showError(message: string) {
  const backdrop = document.createElement('div');
  backdrop.className = 'error-modal-backdrop';
  backdrop.innerHTML = '<div class="error-modal"><div class="error-modal-icon">!</div><div class="error-modal-message"></div><button class="error-modal-close">OK</button></div>';
  backdrop.querySelector('.error-modal-message')!.textContent = message;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.error-modal-close')!.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });
}

const uploadInput = controls.querySelector<HTMLInputElement>('#image-upload')!;
const gridSelect = controls.querySelector<HTMLSelectElement>('#grid-size')!;
const recordBtn = controls.querySelector<HTMLButtonElement>('#record-btn')!;
const resetBtn = controls.querySelector<HTMLButtonElement>('#reset-btn')!;
const saveBtn = controls.querySelector<HTMLButtonElement>('#save-btn')!;
const loadInput = controls.querySelector<HTMLInputElement>('#load-input')!;
const progressEl = header.querySelector<HTMLElement>('#progress')!;

// Wire image upload
onImageUpload(uploadInput, (img, imageData) => {
  const { gridCols } = store.getState();
  const { rows, cols } = computeSquareGrid(imageData.width, imageData.height, gridCols);
  const tiles = splitImageIntoTiles(imageData, rows, cols);
  store.update({
    sourceImage: img,
    sourceImageData: imageData,
    gridRows: rows,
    gridCols: cols,
    tiles,
    phase: 'image-loaded',
    completedCount: 0,
    videos: new Map(),
  });
});

// Wire grid size change
onGridSizeChange(gridSelect, (cols) => {
  const state = store.getState();
  if (state.completedCount > 0) {
    const confirmed = window.confirm(
      'Changing grid size will reset matched tiles. Continue?',
    );
    if (!confirmed) {
      gridSelect.value = String(state.gridCols);
      return;
    }
  }

  const partial: Partial<typeof state> = { gridCols: cols };
  if (state.sourceImageData) {
    const sq = computeSquareGrid(state.sourceImageData.width, state.sourceImageData.height, cols);
    state.videos.forEach((v) => URL.revokeObjectURL(v.objectUrl));
    partial.gridRows = sq.rows;
    partial.tiles = splitImageIntoTiles(state.sourceImageData, sq.rows, sq.cols);
    partial.completedCount = 0;
    partial.videos = new Map();
  }
  store.update(partial);
});

// Record button: toggle recording and run matching on stop
recordBtn.addEventListener('click', async () => {
  recordBtn.disabled = true;
  const state = store.getState();

  if (state.phase === 'image-loaded') {
    // Start recording
    store.update({ phase: 'recording' });
    preview.classList.remove('hidden');
    try {
      recorderHandle = await startRecording(previewVideo);
    } catch {
      alert('Camera access was denied. Please allow camera access and try again.');
      preview.classList.add('hidden');
      store.update({ phase: 'image-loaded' });
      return;
    }
    recordBtn.textContent = 'Stop';
    recordBtn.classList.add('recording');
    recordBtn.disabled = false;
  } else if (state.phase === 'recording' && recorderHandle) {
    // Stop recording and match
    store.update({ phase: 'processing' });
    recordBtn.textContent = 'Matching...';
    recordBtn.disabled = true;
    preview.classList.add('hidden');
    previewVideo.srcObject = null;
    recordBtn.classList.remove('recording');

    const handle = recorderHandle;
    recorderHandle = null;

    let video: RecordedVideo | undefined;
    try {
      showProgress('Stopping recording...', 0);
      video = await handle.stop();
      const currentState = store.getState();
      const updatedVideos = new Map(currentState.videos);
      updatedVideos.set(video.id, video);
      store.update({ videos: updatedVideos });

      const match = await findBestMatch(video.blob, currentState.tiles, currentState.sourceImageData!, showProgress);
      if (match) {
        const freshState = store.getState();
        const targetTile = freshState.tiles.find((t) => t.id === match.tileId);
        if (!targetTile || targetTile.width !== match.frame.imageData.width || targetTile.height !== match.frame.imageData.height) {
          // Grid was changed during processing; discard stale match
          return;
        }
        const updatedTiles = freshState.tiles.map((tile) =>
          tile.id === match.tileId
            ? {
                ...tile,
                matched: true,
                matchedVideoId: video!.id,
                matchedFrameData: match.frame.imageData,
              }
            : tile,
        );
        const newCount = updatedTiles.filter((t) => t.matched).length;
        store.update({
          tiles: updatedTiles,
          completedCount: newCount,
        });
      }
    } catch (err) {
      console.error('Recording/matching failed:', err);
      showError('Something went wrong while processing your recording. Please try again.');
      // Clean up video object URL if it was created before the error
      if (video) {
        const failState = store.getState();
        const failedVideo = failState.videos.get(video.id);
        if (failedVideo) URL.revokeObjectURL(failedVideo.objectUrl);
      }
    } finally {
      hideProgress();
      handle.stream.getTracks().forEach((t) => t.stop());
      const afterState = store.getState();
      const allDone = afterState.completedCount === afterState.tiles.length && afterState.tiles.length > 0;
      store.update({ phase: 'image-loaded' });
      if (!allDone) {
        recordBtn.disabled = false;
        recordBtn.textContent = 'Record';
      } else {
        recordBtn.disabled = true;
        recordBtn.textContent = 'Complete';
      }
    }
  }
});

// Reset button
resetBtn.addEventListener('click', () => {
  const state = store.getState();
  // Revoke all object URLs
  state.videos.forEach((video) => {
    URL.revokeObjectURL(video.objectUrl);
  });
  preview.classList.add('hidden');
  previewVideo.srcObject = null;
  store.reset();
  gridSelect.value = '8';
});

// Save button
saveBtn.addEventListener('click', async () => {
  const state = store.getState();
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  try {
    const blob = await saveMosaic(state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mosaic.vidmo';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

// Load input
loadInput.addEventListener('change', async () => {
  const file = loadInput.files?.[0];
  if (!file) return;
  try {
    const data = await loadMosaic(file);
    // Revoke old URLs
    store.getState().videos.forEach((v) => URL.revokeObjectURL(v.objectUrl));
    store.update({
      phase: 'image-loaded',
      sourceImage: data.sourceImage,
      sourceImageData: data.sourceImageData,
      gridRows: data.gridRows,
      gridCols: data.gridCols,
      tiles: data.tiles,
      videos: data.videos,
      completedCount: data.completedCount,
    });
    gridSelect.value = String(data.gridCols);
  } catch (err) {
    alert('Failed to load mosaic file.');
    console.error(err);
  }
  loadInput.value = '';
});

// Subscribe to state changes
store.subscribe((state) => {
  // Update record button state
  recordBtn.disabled = state.phase === 'idle' || state.phase === 'processing';

  // Disable grid-size change during recording/processing
  gridSelect.disabled = state.phase === 'recording' || state.phase === 'processing';

  // Enable save when there are matched tiles
  saveBtn.disabled = state.completedCount === 0;

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

  // Show celebration when mosaic is complete
  let celebrationEl = document.querySelector('.celebration') as HTMLElement | null;
  if (state.completedCount === state.tiles.length && state.tiles.length > 0) {
    if (!celebrationEl) {
      celebrationEl = document.createElement('div');
      celebrationEl.className = 'celebration';
      celebrationEl.textContent = 'Mosaic Complete!';
      grid.parentElement?.insertBefore(celebrationEl, grid.nextSibling);
    }
  } else if (celebrationEl) {
    celebrationEl.remove();
  }
});
