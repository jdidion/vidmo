import type { ExtractedFrame } from '../types';
import { computeHistogram } from '../image/histogram';

function waitForEvent(
  el: HTMLElement | HTMLVideoElement,
  event: string,
): Promise<Event> {
  return new Promise((resolve) =>
    el.addEventListener(event, resolve, { once: true }),
  );
}

async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  let duration = video.duration;
  if (Number.isFinite(duration) && duration > 0) return duration;

  // WebM blobs often report Infinity — seek to end to force browser to compute it
  video.currentTime = 1e10;
  await waitForEvent(video, 'seeked');
  duration = video.currentTime; // actual end time
  video.currentTime = 0;
  await waitForEvent(video, 'seeked');

  return duration > 0 ? duration : 1;
}

export async function extractFrames(
  videoBlob: Blob,
  targetWidth: number,
  targetHeight: number,
  onProgress?: (current: number, total: number) => void,
): Promise<ExtractedFrame[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  const objectUrl = URL.createObjectURL(videoBlob);
  video.src = objectUrl;

  try {
    await waitForEvent(video, 'loadedmetadata');
    const duration = await resolveDuration(video);

    let N = Math.min(Math.ceil(duration * 2), 30);
    if (N < 1) N = 1;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;

    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < N; i++) {
      video.currentTime = ((i + 0.5) * duration) / N;
      await waitForEvent(video, 'seeked');

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const histogram = computeHistogram(imageData.data);

      frames.push({ time: video.currentTime, imageData, histogram });
      onProgress?.(i + 1, N);
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
