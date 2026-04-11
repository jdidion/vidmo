import type { Tile } from '../types';
import { computeHistogram } from './histogram';

/**
 * Extract pixel data for a rectangular tile from a full ImageData.
 */
export function extractTilePixels(
  fullData: ImageData,
  tile: { x: number; y: number; width: number; height: number },
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tile.width * tile.height * 4);
  const fullWidth = fullData.width;

  for (let row = 0; row < tile.height; row++) {
    const srcStart = ((tile.y + row) * fullWidth + tile.x) * 4;
    const srcEnd = srcStart + tile.width * 4;
    const dstStart = row * tile.width * 4;
    out.set(fullData.data.subarray(srcStart, srcEnd), dstStart);
  }

  return out;
}

/**
 * Split an ImageData into a grid of tiles, computing a histogram for each.
 */
export function splitImageIntoTiles(
  imageData: ImageData,
  rows: number,
  cols: number,
): Tile[] {
  const baseTileWidth = Math.floor(imageData.width / cols);
  const baseTileHeight = Math.floor(imageData.height / rows);
  const tiles: Tile[] = [];
  let id = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * baseTileWidth;
      const y = row * baseTileHeight;
      const tileWidth = col === cols - 1 ? imageData.width - x : baseTileWidth;
      const tileHeight = row === rows - 1 ? imageData.height - y : baseTileHeight;

      const pixels = extractTilePixels(imageData, {
        x,
        y,
        width: tileWidth,
        height: tileHeight,
      });

      tiles.push({
        id: id++,
        row,
        col,
        x,
        y,
        width: tileWidth,
        height: tileHeight,
        histogram: computeHistogram(pixels),
        matched: false,
        matchedVideoId: null,
        matchedFrameData: null,
      });
    }
  }

  return tiles;
}
