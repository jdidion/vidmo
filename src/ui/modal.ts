let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

export function closeModal(): void {
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    const video = backdrop.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    backdrop.remove();
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
}

export function openModal(videoUrl: string): void {
  // Close any existing modal first
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const content = document.createElement('div');
  content.className = 'modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', closeModal);

  const video = document.createElement('video');
  video.src = videoUrl;
  video.controls = true;
  video.autoplay = true;

  content.appendChild(closeBtn);
  content.appendChild(video);
  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  // Close on backdrop click (but not on modal-content)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  // Close on Escape key
  escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', escapeHandler);
}
