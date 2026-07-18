(() => {
  const field = document.querySelector("[data-drawings-field]");
  const cursor = document.querySelector("[data-drawings-cursor]");
  const stage = document.querySelector(".drawings-stage");
  const lightbox = document.querySelector("[data-drawings-lightbox]");
  const lightboxDismiss = document.querySelector("[data-drawings-lightbox-dismiss]");
  const lightboxImage = document.querySelector("[data-drawings-lightbox-image]");
  const lightboxTitle = document.querySelector("[data-drawings-lightbox-title]");
  const lightboxDate = document.querySelector("[data-drawings-lightbox-date]");
  const lightboxDescription = document.querySelector(
    "[data-drawings-lightbox-description]"
  );

  if (
    !field
    || !cursor
    || !stage
    || !lightbox
    || !lightboxDismiss
    || !lightboxImage
    || !lightboxTitle
    || !lightboxDate
    || !lightboxDescription
  ) {
    return;
  }

  // Edit artwork titles, dates, and descriptions here as the collection evolves.
  const drawings = [
    {
      src: "../drawings/at_lsd_drawing_display.webp",
      width: 718,
      height: 1200,
      label: "",
      title: "over(lap)",
      date: "06.12.26",
      description: "a sketch done at <a href=\"https://lightandsound.design/\" target=\"_blank\" rel=\"noopener noreferrer\">lightandsound.design</a>, <br>brooklyn, new york",
    },
    {
      src: "../drawings/bushwick_film_col_drawing_display.webp",
      width: 738,
      height: 1200,
      label: "buchwick film collective drawing",
      title: "\"infintesertion.\"",
      date: "6.9.26",
      description: "a sketch done at bushwick film collective <br>open screening.",
    },
    {
      src: "../drawings/deep_listening_drawing_display.webp",
      width: 917,
      height: 1200,
      label: "deep listening drawing",
      title: "sonic and beyond sonic",
      date: "date unknown",
      description: "applying <a href=\"https://paulineoliveros.us/about.html\" target=\"_blank\" rel=\"noopener noreferrer\">pauline oliveros</a>' deep listening practice widely.",
    },
    {
      src: "../drawings/drawing_001_display.webp",
      width: 868,
      height: 1200,
      label: "unititled 001",
      title: "untitled 001",
      date: "february 2026",
      description: "completed at <a href=\"https://www.zendocoffee.com/\" target=\"_blank\" rel=\"noopener noreferrer\">zendo coffee</a>, albuquerque, new mexico, with gabe + ankit.",
    },
    {
      src: "../drawings/drawing_002_display.webp",
      width: 868,
      height: 1200,
      label: "untitled 002",
      title: "untitled 002",
      date: "march 2026",
      description: "while listening to <a href=\"https://blacktruffle.bandcamp.com/album/even-colder-spring\" target=\"_blank\" rel=\"noopener noreferrer\">even colder spring</a>, cities aviv.",
    },
    {
      src: "../drawings/drawing_003_display.webp",
      width: 863,
      height: 1200,
      label: "untitled 003",
      title: "untitled 003",
      date: "june 2026",
      description: "while listening to <a href=\"https://navybluethetruest.bandcamp.com/album/sir-render\" target=\"_blank\" rel=\"noopener noreferrer\">sir render</a> by navy blue.",
    },
    {
      src: "../drawings/drawing_004_display.webp",
      width: 866,
      height: 1200,
      label: "untitled 004",
      title: "untitled 004",
      date: "june 2026",
      description: "while tabling for <em>lexiconic.</em> at red hook art market.",
    },
  ];

  const configuredDriftSpeed = Number.parseFloat(
    window.getComputedStyle(document.documentElement)
      .getPropertyValue("--drawings-drift-speed")
  );
  const MAX_POINTER_SPEED = (
    Number.isFinite(configuredDriftSpeed) && configuredDriftSpeed > 0
      ? configuredDriftSpeed
      : 185
  );
  const DRIFT_SPEED_SCALE = MAX_POINTER_SPEED / 160;
  const CENTER_DEAD_ZONE = 0.04;
  const VELOCITY_EASING = 7;
  const LAYOUT_SEED = 1769;
  const LIGHTBOX_FADE_DURATION = 650;
  const ARROW_REVEAL_DURATION = 360;
  const FRAME_REVEAL_DURATION = 260;

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let tiles = [];
  let minX = 0;
  let minY = 0;
  let spanX = 0;
  let spanY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let targetVelocityX = 0;
  let targetVelocityY = 0;
  let pointerIsActive = false;
  let pointerX = 0;
  let pointerY = 0;
  let lastFrameTime = null;
  let animationFrame = null;
  let resizeFrame = null;
  let closeLightboxTimer = null;
  let focusBeforeLightbox = null;
  let metadataTypewriterRun = 0;
  let activeDrawing = null;
  let introSequenceStarted = false;

  const metadataElements = [
    lightboxTitle,
    lightboxDate,
    lightboxDescription,
  ];

  const wait = (duration) => new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

  const cancelMetadataTypewriter = () => {
    metadataTypewriterRun += 1;
    metadataElements.forEach((element) => {
      element.classList.remove("is-typing");
    });
  };

  const clearLightboxMetadata = () => {
    metadataElements.forEach((element) => {
      element.textContent = "";
      element.classList.remove("is-typing");
    });
  };

  const typeText = async (element, text, delay, run) => {
    element.textContent = "";
    element.classList.add("is-typing");

    for (const character of text) {
      if (run !== metadataTypewriterRun || lightbox.hidden) {
        element.classList.remove("is-typing");
        return false;
      }

      element.textContent += character;
      await wait(delay);
    }

    element.classList.remove("is-typing");
    return run === metadataTypewriterRun;
  };

  const renderInlineMarkup = (element, markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup;
    element.replaceChildren(template.content.cloneNode(true));
  };

  const typeInlineMarkup = async (element, markup, delay, run) => {
    renderInlineMarkup(element, markup);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let textNode = walker.nextNode();

    while (textNode) {
      textNodes.push({ node: textNode, text: textNode.textContent });
      textNode.textContent = "";
      textNode = walker.nextNode();
    }

    element.classList.add("is-typing");

    for (const { node, text } of textNodes) {
      for (const character of text) {
        if (run !== metadataTypewriterRun || lightbox.hidden) {
          element.classList.remove("is-typing");
          return false;
        }

        node.textContent += character;
        await wait(delay);
      }
    }

    element.classList.remove("is-typing");
    return run === metadataTypewriterRun;
  };

  const startMetadataTypewriter = async (drawing) => {
    cancelMetadataTypewriter();
    clearLightboxMetadata();
    const run = metadataTypewriterRun;

    if (reducedMotion.matches) {
      lightboxTitle.textContent = drawing.title;
      lightboxDate.textContent = drawing.date;
      renderInlineMarkup(lightboxDescription, drawing.description);
      return;
    }

    await wait(280);
    if (!await typeText(lightboxTitle, drawing.title, 55, run)) {
      return;
    }
    await wait(180);
    if (!await typeText(lightboxDate, drawing.date, 42, run)) {
      return;
    }
    await wait(220);
    await typeInlineMarkup(lightboxDescription, drawing.description, 32, run);
  };

  const seededRandom = (seed) => {
    let value = seed >>> 0;

    return () => {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffledDrawingIndexes = (random) => {
    const indexes = drawings.map((_, index) => index);

    for (let index = indexes.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
    }

    return indexes;
  };

  const createDrawingIndexGrid = (rowCount, columnCount, random) => {
    const cellCount = rowCount * columnCount;
    const drawingIndexes = Array(cellCount).fill(-1);
    const usageCounts = drawings.map(() => 0);
    const candidateOrders = drawingIndexes.map(() => shuffledDrawingIndexes(random));
    const neighborOffsets = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset !== 0 || columnOffset !== 0) {
          neighborOffsets.push([rowOffset, columnOffset]);
        }
      }
    }

    const canUseDrawing = (cellIndex, drawingIndex) => {
      const row = Math.floor(cellIndex / columnCount);
      const column = cellIndex % columnCount;

      return neighborOffsets.every(([rowOffset, columnOffset]) => {
        const neighborRow = (row + rowOffset + rowCount) % rowCount;
        const neighborColumn = (
          column + columnOffset + columnCount
        ) % columnCount;
        const neighborIndex = neighborRow * columnCount + neighborColumn;

        return drawingIndexes[neighborIndex] !== drawingIndex;
      });
    };

    const assignCell = (cellIndex) => {
      if (cellIndex === cellCount) {
        return true;
      }

      const candidates = [...candidateOrders[cellIndex]].sort((first, second) => (
        usageCounts[first] - usageCounts[second]
      ));

      for (const drawingIndex of candidates) {
        if (!canUseDrawing(cellIndex, drawingIndex)) {
          continue;
        }

        drawingIndexes[cellIndex] = drawingIndex;
        usageCounts[drawingIndex] += 1;

        if (assignCell(cellIndex + 1)) {
          return true;
        }

        drawingIndexes[cellIndex] = -1;
        usageCounts[drawingIndex] -= 1;
      }

      return false;
    };

    if (!assignCell(0)) {
      throw new Error("Unable to create a non-repeating drawing layout.");
    }

    return drawingIndexes;
  };

  const renderTile = (tile) => {
    tile.element.style.transform = `translate3d(${tile.x}px, ${tile.y}px, 0) rotate(${tile.rotation}deg)`;
  };

  const setDrawingCursorState = (isOverDrawing) => {
    cursor.classList.toggle(
      "is-over-drawing",
      isOverDrawing && lightbox.hidden
    );
  };

  const pointerIsInsideTile = (tile) => {
    const centerX = tile.x + tile.width / 2;
    const centerY = tile.y + tile.height / 2;
    const deltaX = pointerX - centerX;
    const deltaY = pointerY - centerY;
    const angle = tile.rotation * (Math.PI / 180);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const localX = deltaX * cosine + deltaY * sine;
    const localY = -deltaX * sine + deltaY * cosine;

    return Math.abs(localX) <= tile.width / 2
      && Math.abs(localY) <= tile.height / 2;
  };

  const updateDrawingCursorFromPointer = () => {
    const isOverDrawing = pointerIsActive
      && finePointer.matches
      && !reducedMotion.matches
      && stage.classList.contains("is-field-visible")
      && tiles.some(pointerIsInsideTile);

    setDrawingCursorState(isOverDrawing);
  };

  const closeLightbox = () => {
    if (lightbox.hidden) {
      return;
    }

    window.clearTimeout(closeLightboxTimer);
    cancelMetadataTypewriter();
    lightbox.classList.remove("is-open");
    stage.classList.remove("is-drawing-expanded");
    setDrawingCursorState(false);

    closeLightboxTimer = window.setTimeout(() => {
      lightbox.hidden = true;
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      clearLightboxMetadata();
      activeDrawing = null;

      if (focusBeforeLightbox instanceof HTMLElement) {
        focusBeforeLightbox.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : LIGHTBOX_FADE_DURATION);
  };

  const openLightbox = (drawing) => {
    window.clearTimeout(closeLightboxTimer);
    activeDrawing = drawing;
    focusBeforeLightbox = document.activeElement;
    lightboxImage.src = drawing.src;
    lightboxImage.width = drawing.width;
    lightboxImage.height = drawing.height;
    lightboxImage.alt = drawing.label;
    lightbox.setAttribute("aria-label", `Enlarged view of ${drawing.label}`);
    lightbox.hidden = false;
    stage.classList.add("is-drawing-expanded");
    setDrawingCursorState(false);

    window.requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
      lightboxDismiss.focus({ preventScroll: true });
      startMetadataTypewriter(drawing);
    });
  };

  const buildField = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const baseWidth = Math.min(320, Math.max(170, viewportWidth * 0.18));
    const cellWidth = baseWidth * 1.85;
    const cellHeight = baseWidth * 2.15;
    const bufferColumns = 3;
    const bufferRows = 3;
    const columnCount = Math.max(
      4,
      Math.ceil(viewportWidth / cellWidth) + bufferColumns
    );
    const rowCount = Math.max(
      4,
      Math.ceil(viewportHeight / cellHeight) + bufferRows
    );
    const random = seededRandom(LAYOUT_SEED);
    const drawingIndexGrid = createDrawingIndexGrid(
      rowCount,
      columnCount,
      random
    );
    const fragment = document.createDocumentFragment();

    minX = -cellWidth * 1.5;
    minY = -cellHeight * 1.5;
    spanX = columnCount * cellWidth;
    spanY = rowCount * cellHeight;
    tiles = [];

    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        const tileIndex = row * columnCount + column;
        const drawing = drawings[drawingIndexGrid[tileIndex]];
        const width = baseWidth * (0.72 + random() * 0.46);
        const height = width * (drawing.height / drawing.width);
        const staggerPattern = [-0.12, 0.18, 0.04];
        const stagger = cellHeight * staggerPattern[column % staggerPattern.length];
        const xJitter = (random() - 0.5) * cellWidth * 0.58;
        const yJitter = (random() - 0.5) * cellHeight * 0.46;
        const rotation = (random() - 0.5) * 6;
        const image = document.createElement("img");

        image.className = "drawing-tile";
        image.src = drawing.src;
        image.alt = "";
        image.width = drawing.width;
        image.height = drawing.height;
        image.decoding = "async";
        image.loading = "eager";
        image.draggable = false;
        image.style.width = `${width}px`;
        image.addEventListener("click", () => openLightbox(drawing));

        const tile = {
          element: image,
          x: minX + column * cellWidth + xJitter,
          y: minY + row * cellHeight + stagger + yJitter,
          width,
          height,
          rotation,
        };

        renderTile(tile);
        tiles.push(tile);
        fragment.append(image);
      }
    }

    field.replaceChildren(fragment);
    field.dataset.tileCount = String(tiles.length);
    updateDrawingCursorFromPointer();
  };

  const updatePointerTarget = (clientX, clientY) => {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;
    const normalizedX = (clientX - halfWidth) / Math.max(halfWidth, 1);
    const normalizedY = (clientY - halfHeight) / Math.max(halfHeight, 1);
    const distance = Math.min(1, Math.hypot(normalizedX, normalizedY));

    if (distance <= CENTER_DEAD_ZONE) {
      targetVelocityX = 0;
      targetVelocityY = 0;
      return;
    }

    const scaledDistance = (
      (distance - CENTER_DEAD_ZONE) / (1 - CENTER_DEAD_ZONE)
    );
    const speed = MAX_POINTER_SPEED * Math.pow(scaledDistance, 1.1);
    const directionLength = Math.hypot(normalizedX, normalizedY) || 1;

    targetVelocityX = -(normalizedX / directionLength) * speed;
    targetVelocityY = -(normalizedY / directionLength) * speed;
  };

  const updateTouchAutoplayTarget = (time) => {
    targetVelocityX = Math.cos(time / 9000) * 18 * DRIFT_SPEED_SCALE;
    targetVelocityY = Math.sin(time / 11000) * 14 * DRIFT_SPEED_SCALE;
  };

  const wrapTile = (tile) => {
    while (tile.x < minX) {
      tile.x += spanX;
    }

    while (tile.x >= minX + spanX) {
      tile.x -= spanX;
    }

    while (tile.y < minY) {
      tile.y += spanY;
    }

    while (tile.y >= minY + spanY) {
      tile.y -= spanY;
    }
  };

  const animate = (time) => {
    animationFrame = null;

    if (reducedMotion.matches || document.hidden) {
      lastFrameTime = null;
      return;
    }

    if (lastFrameTime === null) {
      lastFrameTime = time;
    }

    const elapsed = Math.min((time - lastFrameTime) / 1000, 0.05);
    const easing = 1 - Math.exp(-VELOCITY_EASING * elapsed);

    if (!finePointer.matches) {
      updateTouchAutoplayTarget(time);
    } else if (!pointerIsActive) {
      targetVelocityX = 0;
      targetVelocityY = 0;
    }

    velocityX += (targetVelocityX - velocityX) * easing;
    velocityY += (targetVelocityY - velocityY) * easing;

    tiles.forEach((tile) => {
      tile.x += velocityX * elapsed;
      tile.y += velocityY * elapsed;
      wrapTile(tile);
      renderTile(tile);
    });

    updateDrawingCursorFromPointer();

    lastFrameTime = time;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (
      animationFrame !== null
      || reducedMotion.matches
      || document.hidden
    ) {
      return;
    }

    lastFrameTime = null;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    lastFrameTime = null;
  };

  const hideCursorAndStopPointer = () => {
    pointerIsActive = false;
    targetVelocityX = 0;
    targetVelocityY = 0;
    cursor.classList.remove("is-visible");
    setDrawingCursorState(false);
  };

  const handlePointerMove = (event) => {
    if (!finePointer.matches || reducedMotion.matches) {
      return;
    }

    pointerIsActive = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    updatePointerTarget(event.clientX, event.clientY);
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    cursor.classList.add("is-visible");
    updateDrawingCursorFromPointer();
  };

  const handleMotionPreferenceChange = () => {
    hideCursorAndStopPointer();
    velocityX = 0;
    velocityY = 0;

    if (activeDrawing && !lightbox.hidden) {
      startMetadataTypewriter(activeDrawing);
    }

    if (reducedMotion.matches) {
      stopAnimation();
      return;
    }

    startAnimation();
  };

  const handlePointerCapabilityChange = () => {
    hideCursorAndStopPointer();
    startAnimation();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopAnimation();
      return;
    }

    startAnimation();
  };

  const handleResize = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      buildField();
    });
  };

  const startIntroSequence = () => {
    if (introSequenceStarted) {
      return;
    }

    introSequenceStarted = true;
    const arrowDelay = reducedMotion.matches ? 0 : ARROW_REVEAL_DURATION;
    const frameDelay = reducedMotion.matches ? 0 : FRAME_REVEAL_DURATION;

    window.setTimeout(() => {
      stage.classList.add("has-drawing-frames");

      window.setTimeout(() => {
        stage.classList.add("is-field-visible");
        updateDrawingCursorFromPointer();
      }, frameDelay);
    }, arrowDelay);
  };

  buildField();
  startAnimation();

  document.addEventListener(
    "coalescion:section-title-complete",
    startIntroSequence,
    { once: true }
  );
  lightboxDismiss.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", hideCursorAndStopPointer);
  window.addEventListener("blur", hideCursorAndStopPointer);
  window.addEventListener("resize", handleResize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  finePointer.addEventListener("change", handlePointerCapabilityChange);
  reducedMotion.addEventListener("change", handleMotionPreferenceChange);
})();
