(() => {
  const headingSelector = "#descrip1, #descrip2, #descrip3";
  const menuSelector = "#poem";
  const logoSelector = ".site-logo";
  const animatedSelector = `${headingSelector}, ${menuSelector}`;

  const timing = {
    initialDelay: 350,
    menuDelay: 300,
    // This exceeds durationVariation + letterJitter, guaranteeing line order.
    lineStagger: 550,
    letterCascade: 450,
    letterJitter: 25,
    minDuration: 1800,
    durationVariation: 300,
    logoDelay: 1000,
  };

  const logoSpin = {
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
    slowdownDuration: 3000,
    idleDuration: 2000,
    automaticVelocity: 360 / 9000,
  };

  let activeAnimations = [];
  let interrupted = false;

  const isBackForwardNavigation = () => {
    const navigationEntry = typeof window.performance.getEntriesByType === "function"
      ? window.performance.getEntriesByType("navigation")[0]
      : null;

    if (navigationEntry) {
      return navigationEntry.type === "back_forward";
    }

    return window.performance.navigation
      && window.performance.navigation.type === 2;
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const rotationInDegrees = (element) => {
    const value = window.getComputedStyle(element).rotate;
    const match = value.match(/(-?\d*\.?\d+)\s*(deg|rad|grad|turn)/);

    if (!match) {
      return logoSpin.angle;
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

  const animateInteractiveSpin = (logo, currentTime) => {
    if (logoSpin.lastFrameTime === null) {
      logoSpin.lastFrameTime = currentTime;
    }

    const elapsed = Math.min(currentTime - logoSpin.lastFrameTime, 50);
    const nextVelocity = Math.max(
      0,
      logoSpin.velocity - logoSpin.deceleration * elapsed
    );

    logoSpin.angle += ((logoSpin.velocity + nextVelocity) / 2) * elapsed;
    logoSpin.velocity = nextVelocity;
    logoSpin.lastFrameTime = currentTime;
    logo.style.rotate = `${logoSpin.angle % 360}deg`;

    if (logoSpin.velocity > 0) {
      logoSpin.animationFrame = window.requestAnimationFrame((time) => {
        animateInteractiveSpin(logo, time);
      });
      return;
    }

    logoSpin.angle %= 360;
    logoSpin.lastFrameTime = null;
    logoSpin.animationFrame = null;
    logoSpin.idleTimer = window.setTimeout(() => {
      logoSpin.idleTimer = null;
      returnToAutomaticRotation(logo);
    }, logoSpin.idleDuration);
  };

  const animateReturnToUpright = (logo, currentTime) => {
    if (logoSpin.lastFrameTime === null) {
      logoSpin.lastFrameTime = currentTime;
    }

    const elapsed = Math.min(currentTime - logoSpin.lastFrameTime, 50);
    const rotationStep = Math.min(
      logoSpin.automaticVelocity * elapsed,
      logoSpin.returnDegreesRemaining
    );

    logoSpin.angle += rotationStep;
    logoSpin.returnDegreesRemaining -= rotationStep;
    logoSpin.lastFrameTime = currentTime;
    logo.style.rotate = `${logoSpin.angle % 360}deg`;

    if (logoSpin.returnDegreesRemaining > 0.01) {
      logoSpin.animationFrame = window.requestAnimationFrame((time) => {
        animateReturnToUpright(logo, time);
      });
      return;
    }

    logoSpin.angle = 0;
    logoSpin.returningToUpright = false;
    logoSpin.interactive = false;
    logoSpin.lastFrameTime = null;
    logoSpin.animationFrame = null;
    logo.style.rotate = "0deg";
    logo.classList.add("is-rotating");
  };

  const returnToAutomaticRotation = (logo) => {
    if (logoSpin.animationFrame !== null) {
      window.cancelAnimationFrame(logoSpin.animationFrame);
      logoSpin.animationFrame = null;
    }

    const normalizedAngle = ((logoSpin.angle % 360) + 360) % 360;

    logoSpin.velocity = 0;
    logoSpin.deceleration = 0;
    logoSpin.angle = normalizedAngle;
    logoSpin.returnDegreesRemaining = (360 - normalizedAngle) % 360;
    logoSpin.returningToUpright = true;
    logoSpin.lastFrameTime = null;

    if (logoSpin.returnDegreesRemaining < 0.01) {
      logoSpin.returnDegreesRemaining = 0;
    }

    logoSpin.animationFrame = window.requestAnimationFrame((time) => {
      animateReturnToUpright(logo, time);
    });
  };

  const spinLogoFromClick = (logo) => {
    if (logoSpin.idleTimer !== null) {
      window.clearTimeout(logoSpin.idleTimer);
      logoSpin.idleTimer = null;
    }

    if (logoSpin.returningToUpright) {
      if (logoSpin.animationFrame !== null) {
        window.cancelAnimationFrame(logoSpin.animationFrame);
        logoSpin.animationFrame = null;
      }
      logoSpin.angle = rotationInDegrees(logo);
      logoSpin.returningToUpright = false;
      logoSpin.lastFrameTime = null;
    }

    if (!logoSpin.interactive) {
      logoSpin.angle = rotationInDegrees(logo);
      logoSpin.interactive = true;
      logo.classList.remove("is-rotating");
      logo.style.rotate = `${logoSpin.angle}deg`;
    }

    logoSpin.velocity += logoSpin.clickImpulse;
    logoSpin.deceleration = logoSpin.velocity / logoSpin.slowdownDuration;
    logoSpin.lastFrameTime = window.performance.now();

    if (logoSpin.animationFrame === null) {
      logoSpin.animationFrame = window.requestAnimationFrame((time) => {
        animateInteractiveSpin(logo, time);
      });
    }
  };

  const setupLogoInteraction = () => {
    document.querySelectorAll(logoSelector).forEach((logo) => {
      logo.addEventListener("click", () => spinLogoFromClick(logo));
      logo.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        spinLogoFromClick(logo);
      });
    });
  };

  const revealAll = () => {
    document.querySelectorAll(animatedSelector).forEach((element) => {
      element.classList.remove("hidden");
    });
  };

  const collectTextNodes = (element) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => (
          node.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
        ),
      }
    );
    const nodes = [];
    let node = walker.nextNode();

    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }

    return nodes;
  };

  const splitIntoLetters = (element) => {
    collectTextNodes(element).forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      const accessibleText = document.createElement("span");

      accessibleText.className = "drift-accessible-text";
      accessibleText.textContent = textNode.nodeValue;
      fragment.append(accessibleText);

      Array.from(textNode.nodeValue).forEach((character) => {
        if (/\s/.test(character)) {
          fragment.append(document.createTextNode(character));
          return;
        }

        const letter = document.createElement("span");
        letter.className = "drift-letter";
        letter.textContent = character;
        letter.setAttribute("aria-hidden", "true");
        fragment.append(letter);
      });

      textNode.replaceWith(fragment);
    });

    return Array.from(element.querySelectorAll(".drift-letter"));
  };

  const restoreText = (elements) => {
    elements.forEach((element) => {
      const parents = new Set();

      element.querySelectorAll(".drift-letter").forEach((letter) => {
        parents.add(letter.parentNode);
        letter.replaceWith(document.createTextNode(letter.textContent));
      });
      element.querySelectorAll(".drift-accessible-text").forEach((text) => {
        text.remove();
      });
      parents.forEach((parent) => parent.normalize());
    });
  };

  const keyframesFor = (letter) => {
    const rect = letter.getBoundingClientRect();
    const startY = -(rect.top + randomBetween(18, 70));
    const startX = randomBetween(-55, 55);
    const sway = randomBetween(16, 42) * (Math.random() < 0.5 ? -1 : 1);
    const rotation = randomBetween(8, 22) * (Math.random() < 0.5 ? -1 : 1);

    return [
      {
        offset: 0,
        opacity: 0,
        transform: `translate3d(${startX}px, ${startY}px, 0) rotate(${rotation}deg)`,
      },
      {
        offset: 0.12,
        opacity: 1,
        transform: `translate3d(${startX + sway * 0.35}px, ${startY * 0.86}px, 0) rotate(${-rotation * 0.7}deg)`,
      },
      {
        offset: 0.44,
        opacity: 1,
        transform: `translate3d(${startX + sway}px, ${startY * 0.56}px, 0) rotate(${rotation * 0.45}deg)`,
      },
      {
        offset: 0.72,
        opacity: 1,
        transform: `translate3d(${startX - sway * 0.55}px, ${startY * 0.27}px, 0) rotate(${-rotation * 0.25}deg)`,
      },
      {
        offset: 0.9,
        opacity: 1,
        transform: `translate3d(${sway * 0.14}px, ${startY * 0.07}px, 0) rotate(${rotation * 0.08}deg)`,
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg)",
      },
    ];
  };

  const animateGroup = async (lines, revealElements, groupDelay = 0) => {
    if (interrupted) {
      revealElements.forEach((element) => element.classList.remove("hidden"));
      return;
    }

    const animations = lines.flatMap((line, lineIndex) => {
      const letters = splitIntoLetters(line);
      const lastLetterIndex = Math.max(letters.length - 1, 1);

      return letters.map((letter, letterIndex) => letter.animate(
        keyframesFor(letter),
        {
          delay: (
            groupDelay
            + lineIndex * timing.lineStagger
            + (letterIndex / lastLetterIndex) * timing.letterCascade
            + randomBetween(0, timing.letterJitter)
          ),
          duration: randomBetween(
            timing.minDuration,
            timing.minDuration + timing.durationVariation
          ),
          easing: "cubic-bezier(0.22, 0.62, 0.28, 1)",
          fill: "backwards",
        }
      ));
    });

    activeAnimations.push(...animations);
    revealElements.forEach((element) => element.classList.remove("hidden"));
    await Promise.allSettled(animations.map((animation) => animation.finished));

    animations.forEach((animation) => animation.cancel());
    activeAnimations = activeAnimations.filter(
      (animation) => !animations.includes(animation)
    );
    restoreText(lines);
  };

  const finishImmediately = () => {
    interrupted = true;
    activeAnimations.forEach((animation) => {
      try {
        animation.finish();
      } catch {
        // An animation can already be idle when the page is interrupted.
      }
    });
    activeAnimations = [];
    restoreText(Array.from(document.querySelectorAll(animatedSelector)));
    revealAll();
  };

  const settleHomeAfterReturn = () => {
    finishImmediately();

    if (!logoSpin.interactive) {
      document.querySelectorAll(logoSelector).forEach((logo) => {
        logo.classList.add("is-rotating");
      });
    }
  };

  document.querySelector(menuSelector)?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      finishImmediately();
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      settleHomeAfterReturn();
    }
  });

  window.startDriftingLettersEffect = async function startDriftingLettersEffect() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (isBackForwardNavigation()) {
      settleHomeAfterReturn();
      return;
    }

    if (reducedMotion.matches || typeof Element.prototype.animate !== "function") {
      revealAll();
      return;
    }

    try {
      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }

      const headingElements = Array.from(document.querySelectorAll(headingSelector));
      const menuContainers = Array.from(document.querySelectorAll(menuSelector));
      const menuLines = menuContainers.flatMap((menu) =>
        Array.from(menu.querySelectorAll(".poem-line"))
      );

      await animateGroup(headingElements, headingElements, timing.initialDelay);

      if (!interrupted) {
        await new Promise((resolve) => setTimeout(resolve, timing.menuDelay));
        await animateGroup(menuLines, menuContainers);
      }

      if (!interrupted) {
        await new Promise((resolve) => setTimeout(resolve, timing.logoDelay));
        if (!logoSpin.interactive) {
          document.querySelectorAll(logoSelector).forEach((logo) => {
            logo.classList.add("is-rotating");
          });
        }
      }
    } catch (error) {
      console.error("Drifting letters animation could not complete.", error);
      finishImmediately();
    }
  };

  setupLogoInteraction();
})();
