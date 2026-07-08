(() => {
  const page = document.querySelector(".in-progress-page");
  const floater = page?.querySelector(".in-progress");

  if (!page || !floater) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fallbackSpeed = 42;
  const fallbackBobDistance = 18;
  const fallbackWanderStrength = 0.75;
  const fallbackSpinDegrees = 7;
  const fallbackStringLength = 56;
  let companion = null;
  let string = null;
  let stayText = null;
  let inProgressAnchor = null;
  let stayPostedAnchor = null;
  let companionVisible = false;
  let x = 0;
  let y = 0;
  let velocityX = 0;
  let velocityY = 0;
  let maxX = 0;
  let maxY = 0;
  let lastFrameTime = null;
  let animationFrame = null;

  const readNumber = (name, fallback) => {
    const value = Number.parseFloat(
      window.getComputedStyle(document.documentElement)
        .getPropertyValue(name)
    );

    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  const readSpeed = () => {
    const speed = readNumber("--in-progress-float-speed", fallbackSpeed);

    return speed > 0 ? speed : fallbackSpeed;
  };

  const readBobDistance = () => (
    readNumber("--in-progress-bob-distance", fallbackBobDistance)
  );

  const readWanderStrength = () => (
    readNumber("--in-progress-wander-strength", fallbackWanderStrength)
  );

  const readSpinDegrees = () => (
    readNumber("--in-progress-spin-degrees", fallbackSpinDegrees)
  );

  const readStringLength = () => (
    readNumber("--stay-posted-string-length", fallbackStringLength)
  );

  const wrapAnchorCharacter = (element, character, className) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => (
          node.nodeValue.includes(character)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
        ),
      }
    );
    const textNode = walker.nextNode();

    if (!textNode) {
      return null;
    }

    const index = textNode.nodeValue.indexOf(character);
    const before = textNode.nodeValue.slice(0, index);
    const after = textNode.nodeValue.slice(index + character.length);
    const anchor = document.createElement("span");

    anchor.className = className;
    anchor.textContent = character;
    textNode.replaceWith(
      document.createTextNode(before),
      anchor,
      document.createTextNode(after)
    );

    return anchor;
  };

  const setupCompanion = () => {
    inProgressAnchor = wrapAnchorCharacter(
      floater,
      "g",
      "in-progress-string-anchor"
    );

    floater.setAttribute("role", "button");
    floater.setAttribute("tabindex", "0");
    floater.setAttribute("aria-pressed", "false");
    floater.setAttribute("aria-label", "Toggle stay posted");

    companion = document.createElement("div");
    companion.className = "stay-posted-companion";
    companion.setAttribute("aria-hidden", "true");

    string = document.createElement("span");
    string.className = "stay-posted-string";

    stayText = document.createElement("p");
    stayText.className = "stay-posted-text";
    stayText.innerHTML = '<em>s<span class="stay-posted-string-anchor">t</span>ay posted</em>';
    stayPostedAnchor = stayText.querySelector(".stay-posted-string-anchor");

    companion.append(string, stayText);
    page.append(companion);
  };

  const keepSpeed = () => {
    const speed = readSpeed();
    const angle = Math.atan2(velocityY || 0.62, velocityX || 0.78);

    velocityX = Math.cos(angle) * speed;
    velocityY = Math.sin(angle) * speed;
  };

  const measureBounds = () => {
    const previousLeft = floater.style.left;
    const previousTop = floater.style.top;
    const previousTransform = floater.style.transform;

    floater.style.left = "0px";
    floater.style.top = "0px";
    floater.style.transform = "none";

    const pageRect = page.getBoundingClientRect();
    const floaterRect = floater.getBoundingClientRect();

    maxX = Math.max(0, pageRect.width - floaterRect.width);
    maxY = Math.max(0, pageRect.height - floaterRect.height);
    x = Math.min(x, maxX);
    y = Math.min(y, maxY);

    floater.style.left = previousLeft;
    floater.style.top = previousTop;
    floater.style.transform = previousTransform;
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const render = (currentTime = window.performance.now()) => {
    const elapsedSeconds = currentTime / 1000;
    const bobDistance = readBobDistance();
    const spinDegrees = readSpinDegrees();
    const bobX = (
      Math.sin(elapsedSeconds * 1.17) * bobDistance * 0.52
      + Math.sin(elapsedSeconds * 0.43 + 1.8) * bobDistance * 0.35
    );
    const bobY = (
      Math.sin(elapsedSeconds * 1.73 + 0.9) * bobDistance
      + Math.sin(elapsedSeconds * 0.67 + 2.4) * bobDistance * 0.45
    );
    const rotation = (
      Math.sin(elapsedSeconds * 0.62) * spinDegrees
      + Math.sin(elapsedSeconds * 1.31 + 0.8) * spinDegrees * 0.35
    );

    floater.style.left = `${clamp(x + bobX, 0, maxX)}px`;
    floater.style.top = `${clamp(y + bobY, 0, maxY)}px`;
    floater.style.transform = `rotate(${rotation}deg)`;
    positionCompanion();
  };

  const pointRelativeToPage = (rect, xRatio, yRatio) => {
    const pageRect = page.getBoundingClientRect();

    return {
      x: rect.left - pageRect.left + rect.width * xRatio,
      y: rect.top - pageRect.top + rect.height * yRatio,
    };
  };

  const positionCompanion = () => {
    if (
      !companionVisible
      || !companion
      || !string
      || !stayText
      || !inProgressAnchor
      || !stayPostedAnchor
    ) {
      return;
    }

    const stringLength = readStringLength();
    const source = pointRelativeToPage(
      inProgressAnchor.getBoundingClientRect(),
      0.5,
      1
    );

    companion.style.left = `${source.x}px`;
    companion.style.top = `${source.y}px`;
    string.style.height = `${stringLength}px`;
    string.style.left = "0px";
    string.style.top = "0px";
    stayText.style.left = "0px";
    stayText.style.top = `${stringLength}px`;

    const targetRect = stayPostedAnchor.getBoundingClientRect();
    const target = pointRelativeToPage(targetRect, 0.5, 0);
    const offsetX = source.x - target.x;
    const offsetY = source.y + stringLength - target.y;

    stayText.style.left = `${offsetX}px`;
    stayText.style.top = `${stringLength + offsetY}px`;
  };

  const wanderVelocity = (elapsedSeconds, currentTime) => {
    const wanderStrength = readWanderStrength();
    const speed = readSpeed();
    const seconds = currentTime / 1000;
    const currentAngle = Math.atan2(velocityY || 0.62, velocityX || 0.78);
    const angleDrift = (
      Math.sin(seconds * 0.37) * 0.58
      + Math.sin(seconds * 0.91 + 1.4) * 0.32
      + Math.sin(seconds * 1.63 + 2.1) * 0.16
    ) * wanderStrength * elapsedSeconds;
    const nextAngle = currentAngle + angleDrift;

    velocityX = Math.cos(nextAngle) * speed;
    velocityY = Math.sin(nextAngle) * speed;
  };

  const reflectPosition = () => {
    if (maxX === 0) {
      x = 0;
      velocityX = 0;
    }

    if (maxY === 0) {
      y = 0;
      velocityY = 0;
    }

    while (x < 0 || x > maxX) {
      if (x < 0) {
        x = -x;
        velocityX = Math.abs(velocityX);
      } else {
        x = maxX - (x - maxX);
        velocityX = -Math.abs(velocityX);
      }
    }

    while (y < 0 || y > maxY) {
      if (y < 0) {
        y = -y;
        velocityY = Math.abs(velocityY);
      } else {
        y = maxY - (y - maxY);
        velocityY = -Math.abs(velocityY);
      }
    }

    keepSpeed();
  };

  const animate = (currentTime) => {
    if (lastFrameTime === null) {
      lastFrameTime = currentTime;
    }

    const elapsedSeconds = Math.min((currentTime - lastFrameTime) / 1000, 0.05);

    wanderVelocity(elapsedSeconds, currentTime);
    x += velocityX * elapsedSeconds;
    y += velocityY * elapsedSeconds;
    reflectPosition();
    render(currentTime);
    lastFrameTime = currentTime;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (reducedMotion.matches || animationFrame !== null) {
      return;
    }

    measureBounds();
    x = maxX * 0.52;
    y = maxY * 0.38;
    velocityX = readSpeed() * 0.78;
    velocityY = readSpeed() * 0.62;
    keepSpeed();
    render();
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    lastFrameTime = null;
  };

  const handleMotionPreference = () => {
    if (reducedMotion.matches) {
      stop();
      floater.removeAttribute("style");
      if (companion) {
        companion.classList.remove("is-visible");
      }
      return;
    }

    start();
  };

  const toggleCompanion = () => {
    companionVisible = !companionVisible;
    floater.setAttribute("aria-pressed", String(companionVisible));

    if (companion) {
      companion.classList.toggle("is-visible", companionVisible);
    }

    positionCompanion();
  };

  floater.addEventListener("click", toggleCompanion);
  floater.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleCompanion();
  });

  window.addEventListener("resize", () => {
    measureBounds();
    render();
  });

  reducedMotion.addEventListener("change", handleMotionPreference);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureBounds();
      render();
    });
  }

  setupCompanion();
  start();
})();
