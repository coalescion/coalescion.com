(() => {
  const handleBackToHome = () => {
    try {
      window.sessionStorage.setItem("coalescionSkipHomeIntro", "1");
    } catch {
      // Keep the regular home link working if storage is unavailable.
    }
  };

  const bindBackArrows = () => {
    document.querySelectorAll(".home-back-arrow").forEach((arrow) => {
      arrow.addEventListener("click", handleBackToHome);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindBackArrows);
  } else {
    bindBackArrows();
  }
})();
