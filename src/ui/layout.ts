export function createLayout(container: HTMLElement): {
  grid: HTMLElement;
  controls: HTMLElement;
  preview: HTMLElement;
  header: HTMLElement;
} {
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'header';

  const h1 = document.createElement('h1');
  h1.textContent = 'Vidmo';

  const progress = document.createElement('span');
  progress.id = 'progress';

  header.appendChild(h1);
  header.appendChild(progress);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'mosaic-grid';

  // Controls
  const controls = document.createElement('div');
  controls.className = 'controls';

  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'upload-label';
  uploadLabel.textContent = 'Upload Image';

  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.id = 'image-upload';
  uploadLabel.appendChild(uploadInput);

  const gridSelect = document.createElement('select');
  gridSelect.id = 'grid-size';
  const sizes = ['4x4', '6x6', '8x8', '10x10', '12x12', '16x16', '20x20'];
  for (const size of sizes) {
    const option = document.createElement('option');
    option.value = size;
    option.textContent = size;
    if (size === '8x8') option.selected = true;
    gridSelect.appendChild(option);
  }

  const recordBtn = document.createElement('button');
  recordBtn.id = 'record-btn';
  recordBtn.className = 'record-btn';
  recordBtn.textContent = 'Record';
  recordBtn.disabled = true;

  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-btn';
  resetBtn.textContent = 'Reset';

  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.disabled = true;

  const loadLabel = document.createElement('label');
  loadLabel.className = 'upload-label';
  loadLabel.textContent = 'Load';
  const loadInput = document.createElement('input');
  loadInput.type = 'file';
  loadInput.accept = '.vidmo';
  loadInput.id = 'load-input';
  loadLabel.appendChild(loadInput);

  controls.appendChild(uploadLabel);
  controls.appendChild(gridSelect);
  controls.appendChild(recordBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(saveBtn);
  controls.appendChild(loadLabel);

  // Preview
  const preview = document.createElement('div');
  preview.className = 'preview hidden';

  const monitorLabel = document.createElement('div');
  monitorLabel.className = 'monitor-label';
  monitorLabel.textContent = 'REC';

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  preview.appendChild(monitorLabel);
  preview.appendChild(video);

  // Assemble — preview above grid so it's prominent during recording
  container.appendChild(header);
  container.appendChild(controls);
  container.appendChild(preview);
  container.appendChild(grid);

  return { grid, controls, preview, header };
}
