const MAX_DIMENSION = 1920;

/** Listen for file selection on `input` and deliver the loaded image and its pixel data. */
export function onImageUpload(
  input: HTMLInputElement,
  callback: (img: HTMLImageElement, imageData: ImageData) => void,
): void {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const longest = Math.max(width, height);
        if (longest > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / longest;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        callback(img, imageData);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Listen for changes on a grid-size select element and deliver the new column count. */
export function onGridSizeChange(
  select: HTMLSelectElement,
  callback: (cols: number) => void,
): void {
  select.addEventListener('change', () => {
    callback(Number(select.value));
  });
}

/** Update the progress label with "completed / total tiles". */
export function updateProgress(
  el: HTMLElement,
  completed: number,
  total: number,
): void {
  el.textContent = total > 0 ? `${completed} / ${total} tiles` : '';
}
