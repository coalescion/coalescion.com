(() => {
  const revealNeedleSvgs = async (figure, images) => {
    const imageLoads = images.map((image) => new Promise((resolve) => {
      const source = image.dataset.src;

      if (!source) {
        resolve();
        return;
      }

      const settle = () => resolve();
      image.addEventListener("load", settle, { once: true });
      image.addEventListener("error", settle, { once: true });
      image.src = source;
      image.removeAttribute("data-src");

      if (image.complete && image.naturalWidth) {
        resolve();
      }
    }));

    await Promise.all(imageLoads);

    if (typeof window.scalePoemSvgs === "function") {
      window.scalePoemSvgs();
    }

    figure.hidden = false;
    requestAnimationFrame(() => {
      figure.classList.add("needle-poem-figure--visible");
    });
  };

  const startNeedleIntro = () => {
    const title = document.querySelector(".needle-intro-title");
    const figure = document.querySelector(".needle-poem-figure");
    const images = Array.from(document.querySelectorAll(".needle-poem-figure .poem-image"));

    if (!title || !figure || images.length === 0) {
      return;
    }

    const showTitle = () => title.classList.remove("needle-intro-title--hidden");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const loadSvgs = () => revealNeedleSvgs(figure, images);

    if (!window.TypewriterCore || reducedMotion.matches) {
      showTitle();
      loadSvgs();
      return;
    }

    window.TypewriterCore.createTypewriter({
      selector: ".needle-intro-title",
      isPreformatted: () => true,
      charDelay: (_paragraphID, index, fullText) => {
        const fasterLineStart = fullText.indexOf("a poetry series");
        return fasterLineStart >= 0 && index >= fasterLineStart ? 55 : 70;
      },
      sentencePausePattern: /\n/,
      sentencePauseTime: 350,
      paragraphDelayDefault: 450,
      revealClass: "needle-intro-title--hidden",
      onComplete: loadSvgs,
    }).start();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startNeedleIntro);
  } else {
    startNeedleIntro();
  }
})();
