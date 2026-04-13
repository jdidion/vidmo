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
 * Compute grid dimensions for square tiles given an image size and column count.
 */
export function computeSquareGrid(
  imageWidth: number,
  imageHeight: number,
  cols: number,
): { rows: number; cols: number; tileSize: number } {
  if (cols <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { rows: 0, cols: 0, tileSize: 0 };
  }
  const tileSize = Math.floor(imageWidth / cols);
  if (tileSize <= 0) return { rows: 0, cols: 0, tileSize: 0 };
  const rows = Math.floor(imageHeight / tileSize);
  return { rows, cols, tileSize };
}

/**
 * Split an ImageData into a grid of square tiles, computing a histogram for each.
 */
export function splitImageIntoTiles(
  imageData: ImageData,
  rows: number,
  cols: number,
): Tile[] {
  const tileSize = Math.floor(imageData.width / cols);
  const tiles: Tile[] = [];
  let id = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize;
      const y = row * tileSize;

      const pixels = extractTilePixels(imageData, {
        x,
        y,
        width: tileSize,
        height: tileSize,
      });

      tiles.push({
        id: id++,
        row,
        col,
        x,
        y,
        width: tileSize,
        height: tileSize,
        histogram: computeHistogram(pixels),
        matched: false,
        matchedVideoId: null,
        matchedFrameData: null,
      });
    }
  }

  return tiles;
}
