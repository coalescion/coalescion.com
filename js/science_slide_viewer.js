(() => {
  const viewerSelector = ".science-slide-viewer";

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const slideSrc = (viewer, index) => {
    const slideDir = viewer.dataset.slideDir.replace(/\/$/, "");
    return `${slideDir}/slide-${index}.png`;
  };

  const readHashSlide = (total) => {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    return match ? clamp(Number.parseInt(match[1], 10), 1, total) : 1;
  };

  const preloadSlide = (viewer, index, total) => {
    if (index < 1 || index > total) {
      return;
    }

    const image = new Image();
    image.src = slideSrc(viewer, index);
  };

  const setupSlideViewer = (viewer) => {
    const total = Number.parseInt(viewer.dataset.slideCount, 10);
    const image = viewer.querySelector("[data-slide-image]");
    const currentOutputs = viewer.querySelectorAll("[data-slide-current]");
    const ranges = viewer.querySelectorAll("[data-slide-range]");
    const previousButtons = viewer.querySelectorAll("[data-slide-action='previous']");
    const nextButtons = viewer.querySelectorAll("[data-slide-action='next']");
    const status = viewer.querySelector("[data-slide-status]");

    if (!total || !image) {
      return;
    }

    let current = readHashSlide(total);
    let touchStartX = null;
    let touchStartY = null;

    const setSlide = (nextSlide, options = {}) => {
      current = clamp(nextSlide, 1, total);
      image.src = slideSrc(viewer, current);
      image.alt = `Slide ${current} of ${total}`;
      viewer.style.setProperty("--slide-progress", current / total);

      currentOutputs.forEach((output) => {
        output.textContent = current;
      });

      ranges.forEach((range) => {
        range.value = current;
        range.setAttribute("aria-valuenow", current);
      });

      previousButtons.forEach((button) => {
        button.disabled = current === 1;
      });

      nextButtons.forEach((button) => {
        button.disabled = current === total;
      });

      if (status) {
        status.textContent = `Slide ${current} of ${total}`;
      }

      const hash = `#slide-${current}`;
      if (window.location.hash !== hash) {
        if (options.replaceHash) {
          window.history.replaceState(null, "", hash);
        } else {
          window.history.pushState(null, "", hash);
        }
      }

      preloadSlide(viewer, current + 1, total);
      preloadSlide(viewer, current - 1, total);
    };

    const previousSlide = () => setSlide(current - 1);
    const nextSlide = () => setSlide(current + 1);

    previousButtons.forEach((button) => {
      button.addEventListener("click", previousSlide);
    });

    nextButtons.forEach((button) => {
      button.addEventListener("click", nextSlide);
    });

    ranges.forEach((range) => {
      range.max = total;
      range.addEventListener("input", () => {
        setSlide(Number.parseInt(range.value, 10), { replaceHash: true });
      });
    });

    image.addEventListener("click", nextSlide);

    viewer.addEventListener("keydown", (event) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        nextSlide();
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        previousSlide();
      }

      if (event.key === "Home") {
        event.preventDefault();
        setSlide(1);
      }

      if (event.key === "End") {
        event.preventDefault();
        setSlide(total);
      }
    });

    viewer.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    viewer.addEventListener("touchend", (event) => {
      if (touchStartX === null || touchStartY === null) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        nextSlide();
      } else {
        previousSlide();
      }
    }, { passive: true });

    window.addEventListener("hashchange", () => {
      setSlide(readHashSlide(total), { replaceHash: true });
    });

    setSlide(current, { replaceHash: true });
  };

  const setupAllSlideViewers = () => {
    document.querySelectorAll(viewerSelector).forEach(setupSlideViewer);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupAllSlideViewers);
  } else {
    setupAllSlideViewers();
  }
})();
