(() => {
  const menuSelector = "#poetry-menu";
  const lineSelector = ".poem-line";
  const linkSelector = ".poem-line a";

  // Increase this value to make the whole slide-in animation faster.
  const speedMultiplier = 1.6;
  const scaledTime = (milliseconds) => milliseconds / speedMultiplier;

  const desktopViewport = window.matchMedia("(min-width: 1025px)");

  // Pixels each line settles inward from its normal aligned position.
  // Keep the default subtle on mobile/tablet; pull farther inward on desktop.
  const defaultSettledInset = 1;
  const desktopSettledInset = 100;

  const timing = {
    initialDelay: scaledTime(1400),
    lineStagger: scaledTime(200),
    duration: scaledTime(2600),
    durationVariation: scaledTime(300),
    offscreenGap: 28,
  };

  let activeAnimations = [];
  let interrupted = false;

  const revealMenu = () => {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      menu.classList.remove("hidden");
    });
  };

  const fitMobileMenu = () => {
    const mobileMenu = window.matchMedia("(max-width: 480px)");

    document.querySelectorAll(menuSelector).forEach((menu) => {
      menu.style.removeProperty("--mobile-menu-font-size");

      if (!mobileMenu.matches) {
        return;
      }

      const lines = Array.from(menu.querySelectorAll(linkSelector));
      const availableWidth = menu.clientWidth;
      const longestLineWidth = Math.max(
        0,
        ...lines.map((line) => line.getBoundingClientRect().width)
      );

      if (longestLineWidth <= availableWidth || longestLineWidth === 0) {
        return;
      }

      const preferredFontSize = Number.parseFloat(
        window.getComputedStyle(menu).fontSize
      );
      const fittedFontSize = preferredFontSize
        * (availableWidth / longestLineWidth)
        * 0.995;

      menu.style.setProperty(
        "--mobile-menu-font-size",
        `${fittedFontSize}px`
      );
    });
  };

  const setupMobileTextFitting = () => {
    let resizeFrame = null;
    const scheduleFit = () => {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        fitMobileMenu();
      });
    };

    fitMobileMenu();
    window.addEventListener("resize", scheduleFit);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleFit);
    }
  };

  const isBackForwardNavigation = () => {
    const navigationEntry = typeof window.performance.getEntriesByType === "function"
      ? window.performance.getEntriesByType("navigation")[0]
      : null;

    if (navigationEntry) {
      return navigationEntry.type === "back_forward";
    }

    return window.performance.navigation
      && window.performance.navigation.type === 2;
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const alignedFromRight = (line) => (
    window.getComputedStyle(line).textAlign === "right"
  );

  const startXFor = (link, fromRight) => {
    const rect = link.getBoundingClientRect();

    if (fromRight) {
      return window.innerWidth - rect.left + timing.offscreenGap;
    }

    return -(rect.right + timing.offscreenGap);
  };

  const settledInsetForViewport = () => (
    desktopViewport.matches ? desktopSettledInset : defaultSettledInset
  );

  const finalXFor = (fromRight) => {
    const settledInset = settledInsetForViewport();

    return fromRight ? -settledInset : settledInset;
  };

  const setFinalPosition = (line) => {
    const link = line.querySelector("a");

    if (!link) {
      return;
    }

    link.style.transform = (
      `translate3d(${finalXFor(alignedFromRight(line))}px, 0, 0)`
    );
  };

  const setFinalPositions = () => {
    document
      .querySelectorAll(`${menuSelector} ${lineSelector}`)
      .forEach(setFinalPosition);
  };

  const keyframesFor = (link, fromRight) => {
    const startX = startXFor(link, fromRight);
    const finalX = finalXFor(fromRight);

    return [
      {
        transform: `translate3d(${startX}px, 0, 0)`,
      },
      {
        transform: `translate3d(${finalX}px, 0, 0)`,
      },
    ];
  };

  const finishImmediately = () => {
    interrupted = true;
    activeAnimations.forEach((animation) => {
      try {
        animation.finish();
      } catch {
        // The animation may already be idle if navigation interrupted it.
      }
    });
    activeAnimations = [];
    setFinalPositions();
    revealMenu();
  };

  const animateMenu = async () => {
    const menu = document.querySelector(menuSelector);

    if (!menu) {
      return;
    }

    const lines = Array.from(menu.querySelectorAll(lineSelector));

    if (lines.length === 0) {
      revealMenu();
      return;
    }

    const animations = lines.map((line, index) => {
      const link = line.querySelector("a");

      if (!link) {
        return null;
      }

      return link.animate(
        keyframesFor(link, alignedFromRight(line)),
        {
          delay: timing.initialDelay + index * timing.lineStagger,
          duration: randomBetween(
            timing.duration,
            timing.duration + timing.durationVariation
          ),
          easing: "cubic-bezier(0.18, 0.72, 0.18, 1)",
          fill: "both",
        }
      );
    }).filter(Boolean);

    activeAnimations.push(...animations);
    revealMenu();
    await Promise.allSettled(animations.map((animation) => animation.finished));

    lines.forEach(setFinalPosition);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    animations.forEach((animation) => animation.cancel());
    activeAnimations = activeAnimations.filter(
      (animation) => !animations.includes(animation)
    );
  };

  document.querySelector(menuSelector)?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      finishImmediately();
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      finishImmediately();
    }
  });

  window.startSlidingMenuLines = async function startSlidingMenuLines() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (
      isBackForwardNavigation()
      || reducedMotion.matches
      || typeof Element.prototype.animate !== "function"
    ) {
      setFinalPositions();
      revealMenu();
      return;
    }

    try {
      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }

      fitMobileMenu();
      await animateMenu();
    } catch (error) {
      console.error("Sliding menu animation could not complete.", error);
      finishImmediately();
    }
  };

  setupMobileTextFitting();
})();
