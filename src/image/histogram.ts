import type { Histogram } from '../types';

/**
 * Compute a normalized RGBA histogram from raw pixel data.
 * 4 channels x 8 bins = 32 bins total.
 */
export function computeHistogram(pixels: Uint8ClampedArray): Histogram {
  const histogram = new Float32Array(32);
  const pixelCount = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    const rBin = Math.floor(pixels[i] / 32);
    const gBin = Math.floor(pixels[i + 1] / 32);
    const bBin = Math.floor(pixels[i + 2] / 32);
    const aBin = Math.floor(pixels[i + 3] / 32);

    histogram[rBin] += 1;
    histogram[8 + gBin] += 1;
    histogram[16 + bBin] += 1;
    histogram[24 + aBin] += 1;
  }

  for (let i = 0; i < 32; i++) {
    histogram[i] /= pixelCount;
  }

  return histogram;
}

/**
 * Compare two histograms using the intersection metric.
 * Returns a similarity score in [0, 1].
 */
export function compareHistograms(a: Histogram, b: Histogram): number {
  let sum = 0;
  for (let i = 0; i < 32; i++) {
    sum += Math.min(a[i], b[i]);
  }
  return sum / 4.0;
}
