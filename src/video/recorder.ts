import type { RecordedVideo } from '../types';

export interface RecorderHandle {
  stream: MediaStream;
  stop: () => Promise<RecordedVideo>;
}

const CODEC_CANDIDATES = [
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function negotiateMimeType(): string {
  for (const mime of CODEC_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export async function startRecording(
  previewEl: HTMLVideoElement,
): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: true,
  });

  previewEl.srcObject = stream;

  const mimeType = negotiateMimeType();
  const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];

  let recordingError: Error | null = null;

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  recorder.addEventListener('error', (e) => {
    recordingError = new Error(`Recording failed: ${e}`);
  });

  recorder.start();

  const stop = (): Promise<RecordedVideo> =>
    new Promise((resolve, reject) => {
      if (recordingError) {
        return reject(recordingError);
      }
      recorder.addEventListener('error', (e) => {
        reject(new Error(`Recording failed: ${e}`));
      }, { once: true });
      recorder.addEventListener(
        'stop',
        () => {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || 'video/webm',
          });
          const objectUrl = URL.createObjectURL(blob);

          resolve({
            id: crypto.randomUUID(),
            blob,
            objectUrl,
            timestamp: Date.now(),
          });
        },
        { once: true },
      );
      recorder.stop();
    });

  return { stream, stop };
}

export function releaseCamera(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}
