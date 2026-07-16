(() => {
  const dialog = document.querySelector('.excerpt-lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const image = dialog.querySelector('.excerpt-lightbox-image');
  const title = dialog.querySelector('#excerpt-lightbox-title');
  const originalLink = dialog.querySelector('.excerpt-lightbox-original');
  const closeButton = dialog.querySelector('.excerpt-lightbox-close');

  document.querySelectorAll('.excerpt-page-button').forEach((button) => {
    button.addEventListener('click', () => {
      const thumbnail = button.querySelector('img');
      const source = button.dataset.fullImage;

      image.src = source;
      image.alt = thumbnail.alt;
      title.textContent = button.dataset.pageLabel;
      originalLink.href = source;
      document.body.classList.add('has-open-excerpt');
      dialog.showModal();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-open-excerpt');
    image.removeAttribute('src');
    image.alt = '';
  });
})();
