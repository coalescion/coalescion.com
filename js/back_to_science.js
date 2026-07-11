(() => {
  const skipScienceIntroStorageKey = "coalescionSkipScienceIntro";

  const handleBackToScience = () => {
    try {
      window.sessionStorage.setItem(skipScienceIntroStorageKey, "1");
    } catch {
      // Keep the regular science link working if storage is unavailable.
    }
  };

  const bindBackArrows = () => {
    document.querySelectorAll('a[href="../menu%20pages/science.html"]').forEach((arrow) => {
      arrow.addEventListener("click", handleBackToScience);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindBackArrows);
  } else {
    bindBackArrows();
  }
})();
