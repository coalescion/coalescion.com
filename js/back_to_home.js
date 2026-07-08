(() => {
  const handleBackToHome = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    try {
      window.sessionStorage.setItem("coalescionSkipHomeIntro", "1");
    } catch {
      // Keep the regular home link working if storage is unavailable.
    }

    const referrerUrl = document.referrer ? new URL(document.referrer) : null;
    const cameFromHome = referrerUrl
      && referrerUrl.origin === window.location.origin
      && (referrerUrl.pathname === "/" || referrerUrl.pathname.endsWith("/index.html"));

    if (!cameFromHome || window.history.length <= 1) {
      return;
    }

    event.preventDefault();
    window.history.back();
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
