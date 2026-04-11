import { describe, it, expect } from 'vitest';
import { computeHistogram, compareHistograms } from '../src/image/histogram';

/** Helper: create pixel data for N identical RGBA pixels. */
function makePixels(r: number, g: number, b: number, a: number, count: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return data;
}

describe('computeHistogram', () => {
  it('returns a Float32Array of length 32', () => {
    const pixels = makePixels(128, 128, 128, 255, 4);
    const hist = computeHistogram(pixels);
    expect(hist).toBeInstanceOf(Float32Array);
    expect(hist.length).toBe(32);
  });

  it('places all-red (255,0,0,255) pixels into correct bins', () => {
    const pixels = makePixels(255, 0, 0, 255, 10);
    const hist = computeHistogram(pixels);

    // R channel: value 255 -> bin 7 (255/32 = 7.96, floor = 7)
    expect(hist[7]).toBeCloseTo(1.0);
    // G channel: value 0 -> bin 0
    expect(hist[8]).toBeCloseTo(1.0);
    // B channel: value 0 -> bin 0
    expect(hist[16]).toBeCloseTo(1.0);
    // A channel: value 255 -> bin 7
    expect(hist[31]).toBeCloseTo(1.0);

    // All other bins should be 0
    for (let i = 0; i < 32; i++) {
      if (i !== 7 && i !== 8 && i !== 16 && i !== 31) {
        expect(hist[i]).toBe(0);
      }
    }
  });

  it('distributes mixed pixel values across bins', () => {
    // Two pixels: (0,0,0,0) and (255,255,255,255)
    const data = new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 255]);
    const hist = computeHistogram(data);

    // Each channel: half in bin 0, half in bin 7
    expect(hist[0]).toBeCloseTo(0.5);  // R bin 0
    expect(hist[7]).toBeCloseTo(0.5);  // R bin 7
    expect(hist[8]).toBeCloseTo(0.5);  // G bin 0
    expect(hist[15]).toBeCloseTo(0.5); // G bin 7
  });
});

describe('compareHistograms', () => {
  it('returns 1.0 for identical histograms', () => {
    const pixels = makePixels(100, 50, 200, 255, 8);
    const hist = computeHistogram(pixels);
    expect(compareHistograms(hist, hist)).toBeCloseTo(1.0);
  });

  it('returns close to 0 for completely different histograms', () => {
    // Histogram A: everything in bin 0 per channel
    const pixelsA = makePixels(0, 0, 0, 0, 4);
    const histA = computeHistogram(pixelsA);

    // Histogram B: everything in bin 7 per channel
    const pixelsB = makePixels(255, 255, 255, 255, 4);
    const histB = computeHistogram(pixelsB);

    expect(compareHistograms(histA, histB)).toBeCloseTo(0);
  });

  it('returns a value between 0 and 1 for partially overlapping histograms', () => {
    const pixelsA = makePixels(0, 0, 0, 255, 4);
    const pixelsB = makePixels(128, 0, 0, 255, 4);
    const histA = computeHistogram(pixelsA);
    const histB = computeHistogram(pixelsB);

    const score = compareHistograms(histA, histB);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});
