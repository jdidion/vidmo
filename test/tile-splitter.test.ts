import { describe, it, expect } from 'vitest';
import { extractTilePixels, splitImageIntoTiles } from '../src/image/tile-splitter';

/** Helper: create a minimal ImageData-compatible object. */
function makeImageData(width: number, height: number, fill?: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b, a] = fill(x, y);
        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('splitImageIntoTiles', () => {
  it('returns the correct number of tiles (rows * cols)', () => {
    const img = makeImageData(100, 100);
    const tiles = splitImageIntoTiles(img, 5, 4);
    expect(tiles.length).toBe(20);
  });

  it('computes correct tile coordinates and dimensions', () => {
    const img = makeImageData(120, 80);
    const tiles = splitImageIntoTiles(img, 2, 3);

    // tileWidth = floor(120/3) = 40, tileHeight = floor(80/2) = 40
    expect(tiles[0]).toMatchObject({ row: 0, col: 0, x: 0, y: 0, width: 40, height: 40 });
    expect(tiles[1]).toMatchObject({ row: 0, col: 1, x: 40, y: 0, width: 40, height: 40 });
    expect(tiles[2]).toMatchObject({ row: 0, col: 2, x: 80, y: 0, width: 40, height: 40 });
    expect(tiles[3]).toMatchObject({ row: 1, col: 0, x: 0, y: 40, width: 40, height: 40 });
  });

  it('assigns sequential ids starting from 0', () => {
    const img = makeImageData(60, 60);
    const tiles = splitImageIntoTiles(img, 3, 3);
    tiles.forEach((tile, i) => {
      expect(tile.id).toBe(i);
    });
  });

  it('initializes tiles as unmatched', () => {
    const img = makeImageData(40, 40);
    const tiles = splitImageIntoTiles(img, 2, 2);
    tiles.forEach((tile) => {
      expect(tile.matched).toBe(false);
      expect(tile.matchedVideoId).toBeNull();
      expect(tile.matchedFrameData).toBeNull();
    });
  });

  it('computes a histogram for each tile', () => {
    const img = makeImageData(40, 40);
    const tiles = splitImageIntoTiles(img, 2, 2);
    tiles.forEach((tile) => {
      expect(tile.histogram).toBeInstanceOf(Float32Array);
      expect(tile.histogram.length).toBe(32);
    });
  });
});

describe('extractTilePixels', () => {
  it('extracts correct pixel values from a known image', () => {
    // 4x4 image where pixel value encodes position: R = x*60, G = y*60
    const img = makeImageData(4, 4, (x, y) => [x * 60, y * 60, 0, 255]);

    // Extract a 2x2 tile starting at (2, 1)
    const pixels = extractTilePixels(img, { x: 2, y: 1, width: 2, height: 2 });

    expect(pixels.length).toBe(2 * 2 * 4);

    // Row 0 of tile (image row 1): pixels at (2,1) and (3,1)
    expect(pixels[0]).toBe(120);  // R: 2*60
    expect(pixels[1]).toBe(60);   // G: 1*60
    expect(pixels[2]).toBe(0);    // B
    expect(pixels[3]).toBe(255);  // A

    expect(pixels[4]).toBe(180);  // R: 3*60
    expect(pixels[5]).toBe(60);   // G: 1*60

    // Row 1 of tile (image row 2): pixels at (2,2) and (3,2)
    expect(pixels[8]).toBe(120);  // R: 2*60
    expect(pixels[9]).toBe(120);  // G: 2*60

    expect(pixels[12]).toBe(180); // R: 3*60
    expect(pixels[13]).toBe(120); // G: 2*60
  });

  it('handles a full-image tile (returns same data)', () => {
    const img = makeImageData(3, 3, () => [10, 20, 30, 40]);
    const pixels = extractTilePixels(img, { x: 0, y: 0, width: 3, height: 3 });

    expect(pixels.length).toBe(3 * 3 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(10);
      expect(pixels[i + 1]).toBe(20);
      expect(pixels[i + 2]).toBe(30);
      expect(pixels[i + 3]).toBe(40);
    }
  });
});
