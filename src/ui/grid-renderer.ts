import { Tile } from '../types';

const renderState = new WeakMap<HTMLElement, { prevTiles: Tile[]; prevCols: number }>();

function drawTile(
  div: HTMLElement,
  tile: Tile,
  sourceImageData: ImageData,
  onTileClick: (tileId: number) => void,
): void {
  const canvas = div.querySelector('canvas') ?? document.createElement('canvas');
  canvas.width = tile.width;
  canvas.height = tile.height;
  const ctx = canvas.getContext('2d')!;

  if (tile.matched && tile.matchedFrameData) {
    if (tile.matchedFrameData.width !== tile.width || tile.matchedFrameData.height !== tile.height) {
      const tmp = document.createElement('canvas');
      tmp.width = tile.matchedFrameData.width;
      tmp.height = tile.matchedFrameData.height;
      tmp.getContext('2d')!.putImageData(tile.matchedFrameData, 0, 0);
      ctx.drawImage(tmp, 0, 0, tile.width, tile.height);
    } else {
      ctx.putImageData(tile.matchedFrameData, 0, 0);
    }
    div.className = 'tile matched';
    div.onclick = () => onTileClick(tile.id);
  } else {
    const tileData = ctx.createImageData(tile.width, tile.height);
    const src = sourceImageData.data;
    const srcW = sourceImageData.width;
    const dst = tileData.data;

    for (let row = 0; row < tile.height; row++) {
      const srcOffset = ((tile.y + row) * srcW + tile.x) * 4;
      const dstOffset = row * tile.width * 4;
      dst.set(
        src.subarray(srcOffset, srcOffset + tile.width * 4),
        dstOffset,
      );
    }
    ctx.putImageData(tileData, 0, 0);
    div.className = 'tile';
    div.onclick = null;
  }

  if (!div.contains(canvas)) div.appendChild(canvas);
}

/** Render tile canvases into `container`, diffing against previous state to minimize DOM work. */
export function renderGrid(
  container: HTMLElement,
  tiles: Tile[],
  cols: number,
  sourceImageData: ImageData,
  onTileClick: (tileId: number) => void,
): void {
  const prev = renderState.get(container) ?? { prevTiles: [], prevCols: 0 };

  if (tiles.length !== prev.prevTiles.length || cols !== prev.prevCols) {
    container.innerHTML = '';
    container.style.setProperty('--grid-cols', String(cols));
    for (const tile of tiles) {
      const div = document.createElement('div');
      drawTile(div, tile, sourceImageData, onTileClick);
      container.appendChild(div);
    }
    renderState.set(container, { prevTiles: tiles, prevCols: cols });
    return;
  }

  const children = container.children;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== prev.prevTiles[i]) {
      drawTile(children[i] as HTMLElement, tiles[i], sourceImageData, onTileClick);
    }
  }
  renderState.set(container, { prevTiles: tiles, prevCols: cols });
}
