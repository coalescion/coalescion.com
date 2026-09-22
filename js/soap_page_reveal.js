(() => {
  // Page-reveal delay knob, in milliseconds.
  const PAGE_REVEAL_DELAY = 200;

  const revealPageContent = () => {
    window.setTimeout(() => {
      document.querySelector(".soap-content")?.classList.remove("hidden");
    }, PAGE_REVEAL_DELAY);
  };

  document.addEventListener("coalescion:section-title-complete", revealPageContent, {
    once: true,
  });
})();
