import type { Tile, MatchResult } from '../types';
import { extractFrames } from '../video/frame-extractor';
import { compareHistograms } from '../image/histogram';
import { adjustColors } from '../image/color-adjust';
import { extractTilePixels } from '../image/tile-splitter';

export type ProgressCallback = (stage: string, fraction: number) => void;

export async function findBestMatch(
  videoBlob: Blob,
  tiles: Tile[],
  sourceImageData: ImageData,
  onProgress?: ProgressCallback,
): Promise<MatchResult | null> {
  const unmatched = tiles.filter((tile) => tile.matched === false);
  if (unmatched.length === 0) return null;

  onProgress?.('Extracting frames...', 0);
  const { width: tileWidth, height: tileHeight } = unmatched[0];
  const frames = await extractFrames(videoBlob, tileWidth, tileHeight, (cur, total) => {
    onProgress?.('Extracting frames...', cur / total * 0.7);
  });
  if (frames.length === 0) return null;

  onProgress?.('Finding best match...', 0.7);

  let bestSimilarity = -1;
  let bestFrame = frames[0];
  let bestTile = unmatched[0];

  for (const frame of frames) {
    for (const tile of unmatched) {
      const similarity = compareHistograms(frame.histogram, tile.histogram);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestFrame = frame;
        bestTile = tile;
      }
    }
  }

  onProgress?.('Adjusting colors...', 0.9);
  const tilePixels = extractTilePixels(sourceImageData, bestTile);
  const adjustedImageData = adjustColors(bestFrame.imageData, tilePixels);

  return {
    tileId: bestTile.id,
    frame: { ...bestFrame, imageData: adjustedImageData },
    similarity: bestSimilarity,
  };
}
