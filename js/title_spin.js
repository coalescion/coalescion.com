(() => {
  const titleSelector = ".section-title";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const spinStates = new WeakMap();

  const createSpinState = () => ({
    angle: 0,
    velocity: 0,
    deceleration: 0,
    lastFrameTime: null,
    animationFrame: null,
    clickImpulse: 1.5,
    clickImpulseVariation: 0.16,
    slowdownDuration: 3000,
  });

  const stateFor = (title) => {
    if (!spinStates.has(title)) {
      spinStates.set(title, createSpinState());
    }

    return spinStates.get(title);
  };

  const rotationInDegrees = (title, state) => {
    const value = window.getComputedStyle(title).rotate;
    const match = value.match(/(-?\d*\.?\d+)\s*(deg|rad|grad|turn)/);

    if (!match) {
      return state.angle;
    }

    const amount = Number.parseFloat(match[1]);

    switch (match[2]) {
      case "rad":
        return amount * (180 / Math.PI);
      case "grad":
        return amount * 0.9;
      case "turn":
        return amount * 360;
      default:
        return amount;
    }
  };

  const animateSpin = (title, state, currentTime) => {
    if (state.lastFrameTime === null) {
      state.lastFrameTime = currentTime;
    }

    const elapsed = Math.min(currentTime - state.lastFrameTime, 50);
    const nextVelocity = Math.max(
      0,
      state.velocity - state.deceleration * elapsed
    );

    state.angle += ((state.velocity + nextVelocity) / 2) * elapsed;
    state.velocity = nextVelocity;
    state.lastFrameTime = currentTime;
    title.style.rotate = `${state.angle % 360}deg`;

    if (state.velocity > 0 && !reducedMotion.matches) {
      state.animationFrame = window.requestAnimationFrame((time) => {
        animateSpin(title, state, time);
      });
      return;
    }

    state.angle %= 360;
    state.lastFrameTime = null;
    state.animationFrame = null;
  };

  const spinTitleFromClick = (title) => {
    if (reducedMotion.matches) {
      return;
    }

    const state = stateFor(title);

    if (state.animationFrame === null) {
      state.angle = rotationInDegrees(title, state);
      title.style.rotate = `${state.angle}deg`;
    }

    const clickImpulse = state.clickImpulse
      + (Math.random() * 2 - 1) * state.clickImpulseVariation;

    state.velocity += clickImpulse;
    state.deceleration = state.velocity / state.slowdownDuration;
    state.lastFrameTime = window.performance.now();

    if (state.animationFrame === null) {
      state.animationFrame = window.requestAnimationFrame((time) => {
        animateSpin(title, state, time);
      });
    }
  };

  const stopSpin = (title) => {
    const state = stateFor(title);

    if (state.animationFrame !== null) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }

    state.velocity = 0;
    state.deceleration = 0;
    state.lastFrameTime = null;
  };

  const setupTitleInteraction = () => {
    document.querySelectorAll(titleSelector).forEach((title) => {
      title.classList.add("click-spin-title");
      title.setAttribute("role", "button");
      title.setAttribute("tabindex", "0");
      title.setAttribute("aria-label", `Spin the ${title.textContent.trim()} title`);

      title.addEventListener("click", () => spinTitleFromClick(title));
      title.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        spinTitleFromClick(title);
      });
    });
  };

  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) {
      return;
    }

    document.querySelectorAll(titleSelector).forEach(stopSpin);
  });

  setupTitleInteraction();
})();
