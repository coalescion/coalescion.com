(() => {
  const scriptOptions = document.currentScript?.dataset ?? {};
  const introSelector = scriptOptions.introSelector || "#science-intro";
  const menuSelector = scriptOptions.menuSelector || "#science-menu-container";
  const afterTitleDelay = 450;
  const afterIntroDelay = 550;
  const introCharDelay = 34;
  const skipScienceIntroStorageKey = scriptOptions.storageKey || "coalescionSkipScienceIntro";

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const shouldSkipScienceIntro = () => {
    try {
      return window.sessionStorage.getItem(skipScienceIntroStorageKey) === "1"
        || isBackForwardNavigation();
    } catch {
      return isBackForwardNavigation();
    }
  };

  const consumeSkipScienceIntro = () => {
    try {
      window.sessionStorage.removeItem(skipScienceIntroStorageKey);
    } catch {
      // Keep the page reveal working if storage is unavailable.
    }
  };

  const rememberScienceIntroComplete = () => {
    try {
      window.sessionStorage.setItem(skipScienceIntroStorageKey, "1");
    } catch {
      // Keep the regular science links working if storage is unavailable.
    }
  };

  const revealScienceMenu = () => {
    document.querySelector(menuSelector)?.classList.remove("hidden");
  };

  const revealIntroAndMenu = () => {
    document.querySelector(introSelector)?.classList.remove("hidden");
    revealScienceMenu();
  };

  const startScienceIntro = async () => {
    const intro = document.querySelector(introSelector);
    const menu = document.querySelector(menuSelector);

    if (!intro || !menu) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (shouldSkipScienceIntro()) {
      revealIntroAndMenu();
      consumeSkipScienceIntro();
      return;
    }

    if (reducedMotion.matches || !window.TypewriterCore) {
      revealIntroAndMenu();
      return;
    }

    await delay(afterTitleDelay);

    await window.TypewriterCore.createTypewriter({
      selector: introSelector,
      charDelay: introCharDelay,
      sentencePauseTime: 180,
      paragraphDelayDefault: 0,
    }).start();

    await delay(afterIntroDelay);
    revealScienceMenu();
  };

  document.querySelector(menuSelector)?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      rememberScienceIntroComplete();
    }
  });

  document.addEventListener("coalescion:section-title-complete", startScienceIntro, {
    once: true,
  });
})();
