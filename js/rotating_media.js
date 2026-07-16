(() => {
  const mediaSelector = ".reference-cover";
  const spinStates = new WeakMap();

  const createSpinState = () => ({
    interactive: false,
    angle: 0,
    velocity: 0,
    deceleration: 0,
    lastFrameTime: null,
    animationFrame: null,
    idleTimer: null,
    returningToUpright: false,
    returnDegreesRemaining: 0,
    clickImpulse: 1.5,
    clickImpulseVariation: 0.16,
    slowdownDuration: 3000,
    idleDuration: 2000,
    automaticVelocity: 360 / 9000,
  });

  const stateFor = (element) => {
    if (!spinStates.has(element)) {
      spinStates.set(element, createSpinState());
    }

    return spinStates.get(element);
  };

  const rotationInDegrees = (element, state) => {
    const value = window.getComputedStyle(element).rotate;
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

  const animateInteractiveSpin = (element, state, currentTime) => {
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
    element.style.rotate = `${state.angle % 360}deg`;

    if (state.velocity > 0) {
      state.animationFrame = window.requestAnimationFrame((time) => {
        animateInteractiveSpin(element, state, time);
      });
      return;
    }

    state.angle %= 360;
    state.lastFrameTime = null;
    state.animationFrame = null;
    state.idleTimer = window.setTimeout(() => {
      state.idleTimer = null;
      returnToAutomaticRotation(element, state);
    }, state.idleDuration);
  };

  const animateReturnToUpright = (element, state, currentTime) => {
    if (state.lastFrameTime === null) {
      state.lastFrameTime = currentTime;
    }

    const elapsed = Math.min(currentTime - state.lastFrameTime, 50);
    const rotationStep = Math.min(
      state.automaticVelocity * elapsed,
      state.returnDegreesRemaining
    );

    state.angle += rotationStep;
    state.returnDegreesRemaining -= rotationStep;
    state.lastFrameTime = currentTime;
    element.style.rotate = `${state.angle % 360}deg`;

    if (state.returnDegreesRemaining > 0.01) {
      state.animationFrame = window.requestAnimationFrame((time) => {
        animateReturnToUpright(element, state, time);
      });
      return;
    }

    state.angle = 0;
    state.returningToUpright = false;
    state.interactive = false;
    state.lastFrameTime = null;
    state.animationFrame = null;
    element.style.rotate = "0deg";
    element.classList.add("is-rotating");
  };

  const returnToAutomaticRotation = (element, state) => {
    if (state.animationFrame !== null) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }

    const normalizedAngle = ((state.angle % 360) + 360) % 360;

    state.velocity = 0;
    state.deceleration = 0;
    state.angle = normalizedAngle;
    state.returnDegreesRemaining = (360 - normalizedAngle) % 360;
    state.returningToUpright = true;
    state.lastFrameTime = null;

    state.animationFrame = window.requestAnimationFrame((time) => {
      animateReturnToUpright(element, state, time);
    });
  };

  const spinFromClick = (element) => {
    const state = stateFor(element);

    if (state.idleTimer !== null) {
      window.clearTimeout(state.idleTimer);
      state.idleTimer = null;
    }

    if (state.returningToUpright) {
      if (state.animationFrame !== null) {
        window.cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
      }
      state.angle = rotationInDegrees(element, state);
      state.returningToUpright = false;
      state.lastFrameTime = null;
    }

    if (!state.interactive) {
      state.angle = rotationInDegrees(element, state);
      state.interactive = true;
      element.classList.remove("is-rotating");
      element.style.rotate = `${state.angle}deg`;
    }

    const clickImpulse = state.clickImpulse
      + (Math.random() * 2 - 1) * state.clickImpulseVariation;

    state.velocity += clickImpulse;
    state.deceleration = state.velocity / state.slowdownDuration;
    state.lastFrameTime = window.performance.now();

    if (state.animationFrame === null) {
      state.animationFrame = window.requestAnimationFrame((time) => {
        animateInteractiveSpin(element, state, time);
      });
    }
  };

  document.querySelectorAll(mediaSelector).forEach((element) => {
    element.addEventListener("click", () => spinFromClick(element));
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      spinFromClick(element);
    });
  });
})();
