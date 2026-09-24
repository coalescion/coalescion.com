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
  const mobilePageHost = pamphlet.querySelector("[data-program-mobile-page]");
  const fallbackPages = Array.from(pamphlet.querySelectorAll(".program-fallback-page"));
  const status = pamphlet.querySelector("#program-state-status");

  if (
    !frontButton ||
    !insideLeftButton ||
    !insideRightButton ||
    !backPageButton ||
    !flipFrontButton ||
    !flipOverButton ||
    !flipBackButton ||
    !mobilePageHost ||
    fallbackPages.length !== 4
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
  const mobileQuery = window.matchMedia("(max-width: 600px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobilePages = fallbackPages.map((image) => image.currentSrc || image.src);
  let state = "front";
  let mobilePageIndex = 0;
  let transitionTimer = 0;
  let isTransitioning = false;

  const makeMobileImage = (pageIndex) => {
    const image = document.createElement("img");
    image.className = "program-paper";
    image.src = mobilePages[pageIndex];
    image.alt = "";
    image.draggable = false;
    return image;
  };

  const renderMobilePage = () => {
    mobilePageHost.replaceChildren(makeMobileImage(mobilePageIndex));
    mobilePageHost.hidden = false;
  };

  const finishTransition = (transitionElement) => {
    window.clearTimeout(transitionTimer);
    transitionElement?.remove();
    mobilePageHost.hidden = false;
    delete pamphlet.dataset.programTransition;
    isTransitioning = false;
    updateAccessibility();
  };

  const focusPamphlet = () => {
    try {
      pamphlet.focus({ preventScroll: true });
    } catch {
      pamphlet.focus();
    }
  };

  const updateAccessibility = () => {
    if (mobileQuery.matches) {
      const allButtons = [
        frontButton,
        insideLeftButton,
        insideRightButton,
        backPageButton,
        flipFrontButton,
        flipOverButton,
        flipBackButton,
      ];
      allButtons.forEach((button) => {
        button.disabled = true;
      });

      if (!isTransitioning && mobilePageIndex === 0) {
        frontButton.disabled = false;
        flipOverButton.disabled = false;
      } else if (!isTransitioning && mobilePageIndex === mobilePages.length - 1) {
        backPageButton.disabled = false;
        flipBackButton.disabled = false;
      } else if (!isTransitioning) {
        insideLeftButton.disabled = false;
        insideRightButton.disabled = false;
        flipFrontButton.disabled = false;
        flipOverButton.disabled = false;
      }

      frontButton.setAttribute("aria-expanded", String(mobilePageIndex > 0));
      if (status) {
        status.textContent = `The program is showing page ${mobilePageIndex + 1} of ${mobilePages.length}.`;
      }
      return;
    }

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
    mobilePageIndex = { front: 0, inside: 1, back: mobilePages.length - 1 }[state];
    pamphlet.dataset.programPage = String(mobilePageIndex + 1);
    renderMobilePage();
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

  const setMobilePage = (nextPageIndex) => {
    if (
      pamphlet.inert
      || isTransitioning
      || nextPageIndex < 0
      || nextPageIndex >= mobilePages.length
      || nextPageIndex === mobilePageIndex
    ) {
      return;
    }

    const previousPageIndex = mobilePageIndex;
    const direction = nextPageIndex > previousPageIndex ? "forward" : "backward";
    const leaf = document.createElement("div");
    const front = document.createElement("div");
    const back = document.createElement("div");
    leaf.className = "program-mobile-leaf";
    leaf.dataset.direction = direction;
    leaf.setAttribute("aria-hidden", "true");
    front.className = "program-paper-face program-paper-face--front";
    back.className = "program-paper-face program-paper-face--back";

    const frontPageIndex = direction === "forward" ? previousPageIndex : nextPageIndex;
    const backPageIndex = direction === "forward" ? nextPageIndex : previousPageIndex;
    front.append(makeMobileImage(frontPageIndex));
    back.append(makeMobileImage(backPageIndex));
    leaf.append(front, back);

    mobilePageIndex = nextPageIndex;
    state = mobilePageIndex === 0
      ? "front"
      : mobilePageIndex === mobilePages.length - 1
        ? "back"
        : "inside";
    pamphlet.dataset.programPage = String(mobilePageIndex + 1);
    pamphlet.dataset.programState = state;
    renderMobilePage();
    focusPamphlet();

    if (reducedMotion.matches) {
      updateAccessibility();
      return;
    }

    isTransitioning = true;
    mobilePageHost.hidden = true;
    mobilePageHost.parentElement.append(leaf);
    updateAccessibility();
    leaf.addEventListener("animationend", () => finishTransition(leaf), { once: true });
    transitionTimer = window.setTimeout(() => finishTransition(leaf), 950);
  };

  const moveMobilePage = (offset) => setMobilePage(mobilePageIndex + offset);

  frontButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(1);
    else setState("inside");
  });
  insideLeftButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(-1);
    else setState("front");
  });
  insideRightButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(1);
    else setState("back");
  });
  backPageButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(-1);
    else setState("inside");
  });
  flipFrontButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(-1);
    else setState("front");
  });
  flipOverButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(1);
    else setState("back");
  });
  flipBackButton.addEventListener("click", () => {
    if (mobileQuery.matches) moveMobilePage(-1);
    else setState("inside");
  });

  pamphlet.addEventListener("keydown", (event) => {
    if (pamphlet.inert) {
      return;
    }

    if (mobileQuery.matches) {
      const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!offset) {
        return;
      }
      event.preventDefault();
      moveMobilePage(offset);
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

  const handleLayoutChange = () => {
    pamphlet.querySelector(".program-mobile-leaf")?.remove();
    window.clearTimeout(transitionTimer);
    isTransitioning = false;
    renderMobilePage();
    updateAccessibility();
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleLayoutChange);
  } else {
    mobileQuery.addListener(handleLayoutChange);
  }

  pamphlet.dataset.programPage = "1";
  renderMobilePage();
  pamphlet.classList.add("program-pamphlet--enhanced");
  updateAccessibility();
})();
