import type { Tile, MatchResult } from '../types';
import { extractFrames } from '../video/frame-extractor';
import { compareHistograms } from '../image/histogram';
import { adjustColors } from '../image/color-adjust';
import { extractTilePixels } from '../image/tile-splitter';

export async function findBestMatch(
  videoBlob: Blob,
  tiles: Tile[],
  sourceImageData: ImageData,
): Promise<MatchResult | null> {
  const unmatched = tiles.filter((tile) => tile.matched === false);
  if (unmatched.length === 0) return null;

  const { width: tileWidth, height: tileHeight } = unmatched[0];
  const frames = await extractFrames(videoBlob, tileWidth, tileHeight);
  if (frames.length === 0) return null;

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

  const tilePixels = extractTilePixels(sourceImageData, bestTile);
  const adjustedImageData = adjustColors(bestFrame.imageData, tilePixels);

  return {
    tileId: bestTile.id,
    frame: { ...bestFrame, imageData: adjustedImageData },
    similarity: bestSimilarity,
  };
}
