/**
 * Compute per-channel (R, G, B) mean and standard deviation from pixel data.
 */
function channelStats(
  pixels: Uint8ClampedArray,
): { mean: [number, number, number]; std: [number, number, number] } {
  const pixelCount = pixels.length / 4;
  if (pixelCount === 0) {
    return { mean: [0, 0, 0], std: [0, 0, 0] };
  }

  // Pass 1: compute means
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sumR += pixels[i];
    sumG += pixels[i + 1];
    sumB += pixels[i + 2];
  }
  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;

  // Pass 2: compute variance
  let varR = 0;
  let varG = 0;
  let varB = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const dR = pixels[i] - meanR;
    const dG = pixels[i + 1] - meanG;
    const dB = pixels[i + 2] - meanB;
    varR += dR * dR;
    varG += dG * dG;
    varB += dB * dB;
  }

  return {
    mean: [meanR, meanG, meanB],
    std: [
      Math.sqrt(varR / pixelCount),
      Math.sqrt(varG / pixelCount),
      Math.sqrt(varB / pixelCount),
    ],
  };
}

/**
 * Adjust frame colors to match a tile's color profile using mean+stddev transfer.
 * Returns a new ImageData without mutating the input.
 */
export function adjustColors(
  frameData: ImageData,
  tilePixels: Uint8ClampedArray,
): ImageData {
  const frameStat = channelStats(frameData.data);
  const tileStat = channelStats(tilePixels);

  const adjusted = new Uint8ClampedArray(frameData.data.length);

  for (let i = 0; i < frameData.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const pixel = frameData.data[i + c];
      let value: number;

      if (tileStat.std[c] === 0) {
        // Tile channel is uniform: set all pixels to tile mean
        value = tileStat.mean[c];
      } else if (frameStat.std[c] === 0) {
        // Frame channel is uniform: shift by difference in means
        value = pixel + (tileStat.mean[c] - frameStat.mean[c]);
      } else {
        value =
          (pixel - frameStat.mean[c]) * (tileStat.std[c] / frameStat.std[c]) +
          tileStat.mean[c];
      }

      adjusted[i + c] = Math.max(0, Math.min(255, Math.round(value)));
    }
    // Keep alpha unchanged
    adjusted[i + 3] = frameData.data[i + 3];
  }

  return new ImageData(adjusted, frameData.width, frameData.height);
}
