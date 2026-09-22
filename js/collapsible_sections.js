(() => {
  const triggers = document.querySelectorAll(".collage-section-trigger");
  const programTrigger = Array.from(triggers).find(
    (trigger) => trigger.getAttribute("aria-controls") === "collage-program-panel"
  );
  const programPanel = document.getElementById("collage-program-panel");

  const setExpanded = (trigger, panel, isOpen) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
    panel.hidden = !isOpen;
  };

  triggers.forEach((trigger) => {
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;

    if (!panel) {
      return;
    }

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      const isOpening = !isOpen;

      setExpanded(trigger, panel, isOpening);

      if (
        isOpening &&
        panelId === "collage-film-panel" &&
        programTrigger &&
        programPanel
      ) {
        setExpanded(programTrigger, programPanel, true);
      }
    });
  });
})();
