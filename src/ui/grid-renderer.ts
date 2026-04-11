import { Tile } from '../types';

export function renderGrid(
  container: HTMLElement,
  tiles: Tile[],
  cols: number,
  sourceImageData: ImageData,
  onTileClick: (tileId: number) => void,
): void {
  container.innerHTML = '';
  container.style.setProperty('--grid-cols', String(cols));

  for (const tile of tiles) {
    const div = document.createElement('div');
    div.className = 'tile';

    const canvas = document.createElement('canvas');
    canvas.width = tile.width;
    canvas.height = tile.height;
    const ctx = canvas.getContext('2d')!;

    if (tile.matched && tile.matchedFrameData) {
      ctx.putImageData(tile.matchedFrameData, 0, 0);
      div.classList.add('matched');
      div.addEventListener('click', () => onTileClick(tile.id));
    } else {
      // Draw the tile's portion from the source image
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
    }

    div.appendChild(canvas);
    container.appendChild(div);
  }
}
