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

export async function extractFrames(
  videoBlob: Blob,
  targetWidth: number,
  targetHeight: number,
): Promise<ExtractedFrame[]> {
  const video = document.createElement('video');
  const objectUrl = URL.createObjectURL(videoBlob);
  video.src = objectUrl;

  try {
    await waitForEvent(video, 'loadedmetadata');

    let N = Math.min(Math.ceil(video.duration * 2), 30);
    if (N < 1) N = 1;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;

    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < N; i++) {
      video.currentTime = ((i + 0.5) * video.duration) / N;
      await waitForEvent(video, 'seeked');

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const histogram = computeHistogram(imageData.data);

      frames.push({ time: video.currentTime, imageData, histogram });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
