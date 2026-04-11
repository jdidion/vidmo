import type { ExtractedFrame } from '../types';
import { computeHistogram } from '../image/histogram';

function waitForEvent(
  el: EventTarget,
  event: string,
  timeoutMs = 3000,
): Promise<Event | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      el.removeEventListener(event, handler);
      resolve(null);
    }, timeoutMs);
    function handler(e: Event) {
      clearTimeout(timer);
      resolve(e);
    }
    el.addEventListener(event, handler, { once: true });
  });
}

function captureFrame(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): ExtractedFrame {
  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const histogram = computeHistogram(imageData.data);
  return { time: video.currentTime, imageData, histogram };
}

async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  const duration = video.duration;
  if (Number.isFinite(duration) && duration > 0) return duration;

  // WebM blobs often report Infinity — seek to end to force browser
  video.currentTime = 1e10;
  const seeked = await waitForEvent(video, 'seeked', 3000);
  if (seeked && video.currentTime > 0) {
    const actualDuration = video.currentTime;
    video.currentTime = 0;
    await waitForEvent(video, 'seeked', 2000);
    return actualDuration;
  }

  // Seeking didn't work — return a small default so we at least grab one frame
  return 0;
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
    // Wait for video to be ready
    const loaded = await waitForEvent(video, 'loadedmetadata', 5000);
    if (!loaded) {
      // Can't even load metadata — try playing briefly to grab a frame
      video.play().catch(() => {});
      await waitForEvent(video, 'canplay', 3000);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;

    const duration = await resolveDuration(video);
    const frames: ExtractedFrame[] = [];

    if (duration <= 0) {
      // Video is not seekable — grab whatever frame is currently displayed
      // Play briefly to ensure we have a rendered frame
      video.currentTime = 0;
      await waitForEvent(video, 'seeked', 2000);
      // Also try playing for a moment
      video.play().catch(() => {});
      await new Promise((r) => setTimeout(r, 200));
      video.pause();

      frames.push(captureFrame(video, ctx, targetWidth, targetHeight));
      onProgress?.(1, 1);
      return frames;
    }

    // Seekable video — extract frames at evenly spaced times
    let N = Math.min(Math.ceil(duration * 2), 30);
    if (N < 1) N = 1;

    for (let i = 0; i < N; i++) {
      video.currentTime = ((i + 0.5) * duration) / N;
      const seeked = await waitForEvent(video, 'seeked', 3000);

      if (seeked) {
        frames.push(captureFrame(video, ctx, targetWidth, targetHeight));
      }
      // If seek timed out, skip this frame
      onProgress?.(i + 1, N);
    }

    // If all seeks failed, grab current frame as last resort
    if (frames.length === 0) {
      frames.push(captureFrame(video, ctx, targetWidth, targetHeight));
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
