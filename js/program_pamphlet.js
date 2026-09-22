(() => {
  const pamphlet = document.querySelector(".program-pamphlet");

  if (!pamphlet) {
    return;
  }

  const frontButton = pamphlet.querySelector('[data-program-action="open"]');
  const insideLeftButton = pamphlet.querySelector('[data-program-action="close"]');
  const insideRightButton = pamphlet.querySelector('[data-program-action="open-back"]');
  const backPageButton = pamphlet.querySelector('[data-program-action="reopen-inside"]');
  const flipFrontButton = pamphlet.querySelector('[data-program-action="flip-front"]');
  const flipOverButton = pamphlet.querySelector('[data-program-action="flip-over"]');
  const flipBackButton = pamphlet.querySelector('[data-program-action="flip-back"]');
  const status = pamphlet.querySelector("#program-state-status");

  if (
    !frontButton ||
    !insideLeftButton ||
    !insideRightButton ||
    !backPageButton ||
    !flipFrontButton ||
    !flipOverButton ||
    !flipBackButton
  ) {
    return;
  }

  const states = new Set(["front", "inside", "back"]);
  const controls = {
    front: [frontButton],
    inside: [insideLeftButton, insideRightButton, flipFrontButton, flipOverButton],
    back: [backPageButton, flipBackButton],
  };
  const stateMessages = {
    front: "The program is showing its front cover.",
    inside: "The program is open to pages two and three.",
    back: "The program is showing its back cover with the cast, resources, and contact information.",
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state = "front";
  let transitionTimer = 0;
  let isTransitioning = false;

  const finishTransition = () => {
    window.clearTimeout(transitionTimer);
    delete pamphlet.dataset.programTransition;
    isTransitioning = false;
  };

  const focusPamphlet = () => {
    try {
      pamphlet.focus({ preventScroll: true });
    } catch {
      pamphlet.focus();
    }
  };

  const updateAccessibility = () => {
    Object.entries(controls).forEach(([controlState, buttons]) => {
      buttons.forEach((button) => {
        button.disabled = controlState !== state;
      });
    });

    frontButton.setAttribute("aria-expanded", String(state === "inside"));

    if (status) {
      status.textContent = stateMessages[state];
    }
  };

  const setState = (nextState) => {
    if (
      pamphlet.inert
      || isTransitioning
      || nextState === state
      || !states.has(nextState)
    ) {
      return;
    }

    const previousState = state;
    const isPageTurn =
      (previousState === "inside" && nextState === "back") ||
      (previousState === "back" && nextState === "inside");

    state = nextState;
    isTransitioning = true;
    if (isPageTurn) {
      pamphlet.dataset.programTransition = nextState === "back" ? "to-back" : "to-inside";
    }
    pamphlet.dataset.programState = state;
    updateAccessibility();
    focusPamphlet();

    const transitionDuration = reducedMotion.matches ? 20 : 900;
    transitionTimer = window.setTimeout(finishTransition, transitionDuration);
  };

  frontButton.addEventListener("click", () => setState("inside"));
  insideLeftButton.addEventListener("click", () => setState("front"));
  insideRightButton.addEventListener("click", () => setState("back"));
  backPageButton.addEventListener("click", () => setState("inside"));
  flipFrontButton.addEventListener("click", () => setState("front"));
  flipOverButton.addEventListener("click", () => setState("back"));
  flipBackButton.addEventListener("click", () => setState("inside"));

  pamphlet.addEventListener("keydown", (event) => {
    if (pamphlet.inert) {
      return;
    }

    const nextState = {
      ArrowLeft: { inside: "front", back: "inside" },
      ArrowRight: { front: "inside", inside: "back" },
    }[event.key]?.[state];

    if (!nextState) {
      return;
    }

    event.preventDefault();
    setState(nextState);
  });

  pamphlet.classList.add("program-pamphlet--enhanced");
  updateAccessibility();
})();
