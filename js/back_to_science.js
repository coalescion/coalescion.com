(() => {
  const scriptOptions = document.currentScript?.dataset ?? {};
  const skipScienceIntroStorageKey = scriptOptions.storageKey || "coalescionSkipScienceIntro";
  const backHref = scriptOptions.backHref || "../menu_pages/science.html";

  const handleBackToScience = () => {
    try {
      window.sessionStorage.setItem(skipScienceIntroStorageKey, "1");
    } catch {
      // Keep the regular science link working if storage is unavailable.
    }
  };

  const bindBackArrows = () => {
    document.querySelectorAll(`a[href="${backHref}"]`).forEach((arrow) => {
      arrow.addEventListener("click", handleBackToScience);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindBackArrows);
  } else {
    bindBackArrows();
  }
})();
