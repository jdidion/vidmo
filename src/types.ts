/** RGBA histogram: 4 channels x 8 bins = 32 numbers, normalized by pixel count */
export type Histogram = Float32Array;

export interface Tile {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  histogram: Histogram;
  matched: boolean;
  matchedVideoId: string | null;
  matchedFrameData: ImageData | null;
}

export interface RecordedVideo {
  id: string;
  blob: Blob;
  objectUrl: string;
  timestamp: number;
}

export interface ExtractedFrame {
  time: number;
  imageData: ImageData;
  histogram: Histogram;
}

export interface MatchResult {
  tileId: number;
  frame: ExtractedFrame;
  similarity: number;
}

export type Phase = 'idle' | 'image-loaded' | 'recording' | 'processing';

export interface AppState {
  phase: Phase;
  sourceImage: HTMLImageElement | null;
  sourceImageData: ImageData | null;
  gridRows: number;
  gridCols: number;
  tiles: Tile[];
  videos: Map<string, RecordedVideo>;
  completedCount: number;
}
