import type { AppState, Tile, RecordedVideo } from './types';

interface SavedTile {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  matched: boolean;
  matchedVideoId: string | null;
  frameDataUrl: string | null;
}

interface SavedVideo {
  id: string;
  blobDataUrl: string;
  timestamp: number;
}

interface MosaicFile {
  version: 1;
  gridRows: number;
  gridCols: number;
  sourceImageBase64: string;
  tiles: SavedTile[];
  videos: SavedVideo[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function saveMosaic(state: AppState): Promise<Blob> {
  const sourceImageBase64 = state.sourceImageData
    ? imageDataToDataUrl(state.sourceImageData)
    : '';

  const tiles: SavedTile[] = state.tiles.map((tile) => ({
    id: tile.id,
    row: tile.row,
    col: tile.col,
    x: tile.x,
    y: tile.y,
    width: tile.width,
    height: tile.height,
    matched: tile.matched,
    matchedVideoId: tile.matchedVideoId,
    frameDataUrl: tile.matchedFrameData
      ? imageDataToDataUrl(tile.matchedFrameData)
      : null,
  }));

  const videoEntries = Array.from(state.videos.values());
  const videos: SavedVideo[] = await Promise.all(
    videoEntries.map(async (v) => ({
      id: v.id,
      blobDataUrl: await blobToDataUrl(v.blob),
      timestamp: v.timestamp,
    })),
  );

  const mosaicFile: MosaicFile = {
    version: 1,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    sourceImageBase64,
    tiles,
    videos,
  };

  return new Blob([JSON.stringify(mosaicFile)], { type: 'application/json' });
}

export async function loadMosaic(file: File): Promise<{
  sourceImage: HTMLImageElement;
  sourceImageData: ImageData;
  gridRows: number;
  gridCols: number;
  tiles: Tile[];
  videos: Map<string, RecordedVideo>;
  completedCount: number;
}> {
  const text = await file.text();
  const data: MosaicFile = JSON.parse(text);

  // Reconstruct source image
  const sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = data.sourceImageBase64;
  });

  // Reconstruct source ImageData
  const sourceImageData = await dataUrlToImageData(data.sourceImageBase64);

  // Reconstruct tiles
  const tiles: Tile[] = await Promise.all(
    data.tiles.map(async (saved) => {
      const matchedFrameData = saved.frameDataUrl
        ? await dataUrlToImageData(saved.frameDataUrl)
        : null;
      return {
        id: saved.id,
        row: saved.row,
        col: saved.col,
        x: saved.x,
        y: saved.y,
        width: saved.width,
        height: saved.height,
        histogram: new Float32Array(32),
        matched: saved.matched,
        matchedVideoId: saved.matchedVideoId,
        matchedFrameData,
      };
    }),
  );

  // Reconstruct videos
  const videos = new Map<string, RecordedVideo>();
  for (const saved of data.videos) {
    const blob = dataUrlToBlob(saved.blobDataUrl);
    const objectUrl = URL.createObjectURL(blob);
    videos.set(saved.id, {
      id: saved.id,
      blob,
      objectUrl,
      timestamp: saved.timestamp,
    });
  }

  const completedCount = tiles.filter((t) => t.matched).length;

  return {
    sourceImage,
    sourceImageData,
    gridRows: data.gridRows,
    gridCols: data.gridCols,
    tiles,
    videos,
    completedCount,
  };
}
