(() => {
  const page = document.querySelector(".in-progress-page");
  const elements = [...(page?.querySelectorAll(".sound-collage-entry") || [])];

  if (!page || elements.length === 0) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const initialPositions = [
    [0.52, 0.38],
    [0.08, 0.78],
    [0.78, 0.72],
  ];
  const initialAngles = [0.67, 5.35, 3.72];
  let animationFrame = null;
  let lastFrameTime = null;

  const readNumber = (name, fallback) => {
    const value = Number.parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue(name)
    );

    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const floaters = elements.map((element, index) => ({
    element,
    height: 0,
    index,
    maxX: 0,
    maxY: 0,
    width: 0,
    x: 0,
    y: 0,
    velocityX: Math.cos(initialAngles[index] ?? index) * readNumber("--in-progress-float-speed", 42),
    velocityY: Math.sin(initialAngles[index] ?? index) * readNumber("--in-progress-float-speed", 42),
  }));

  const measureBounds = (floater, setInitialPosition = false) => {
    const { element } = floater;
    const previousLeft = element.style.left;
    const previousTop = element.style.top;
    const previousTransform = element.style.transform;

    element.style.left = "0px";
    element.style.top = "0px";
    element.style.transform = "none";

    const pageRect = page.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    floater.width = elementRect.width;
    floater.height = elementRect.height;
    floater.maxX = Math.max(0, pageRect.width - elementRect.width);
    floater.maxY = Math.max(0, pageRect.height - elementRect.height);

    if (setInitialPosition) {
      const [xRatio, yRatio] = initialPositions[floater.index] || [0.5, 0.5];
      floater.x = floater.maxX * xRatio;
      floater.y = floater.maxY * yRatio;
    } else {
      floater.x = clamp(floater.x, 0, floater.maxX);
      floater.y = clamp(floater.y, 0, floater.maxY);
    }

    element.style.left = previousLeft;
    element.style.top = previousTop;
    element.style.transform = previousTransform;
  };

  const reflectPosition = (floater) => {
    if (floater.x < 0 || floater.x > floater.maxX) {
      floater.x = clamp(floater.x, 0, floater.maxX);
      floater.velocityX *= -1;
    }

    if (floater.y < 0 || floater.y > floater.maxY) {
      floater.y = clamp(floater.y, 0, floater.maxY);
      floater.velocityY *= -1;
    }
  };

  const rotationAt = (floater, currentTime) => {
    const seconds = currentTime / 1000;
    const phase = floater.index * 2.1;
    const spinDegrees = readNumber("--in-progress-spin-degrees", 7);

    return Math.sin(seconds * 0.62 + phase) * spinDegrees;
  };

  const collisionPolygons = (floater, currentTime) => {
    const isHexagon = floater.element.matches(".sound-collage-entry--hexagon");
    const vertices = isHexagon
      ? [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]]
      : [[0.01, 0.025], [0.99, 0.025], [0.99, 0.975], [0.01, 0.975]];
    const outlineRotations = isHexagon ? [0, 10, 20, -10] : [0, 4, 8, -4];
    const centerX = floater.x + floater.width / 2;
    const centerY = floater.y + floater.height / 2;
    const parentRotation = rotationAt(floater, currentTime);
    return outlineRotations.map((outlineRotation) => {
      const radians = (parentRotation + outlineRotation) * Math.PI / 180;
      const cosine = Math.cos(radians);
      const sine = Math.sin(radians);

      return vertices.map(([xRatio, yRatio]) => {
        const localX = (xRatio - 0.5) * floater.width;
        const localY = (yRatio - 0.5) * floater.height;

        return {
          x: centerX + localX * cosine - localY * sine,
          y: centerY + localX * sine + localY * cosine,
        };
      });
    });
  };

  const projectPolygon = (polygon, axisX, axisY) => {
    let minimum = Infinity;
    let maximum = -Infinity;

    polygon.forEach((point) => {
      const projection = point.x * axisX + point.y * axisY;
      minimum = Math.min(minimum, projection);
      maximum = Math.max(maximum, projection);
    });

    return { maximum, minimum };
  };

  const collisionDetails = (firstPolygon, secondPolygon, first, second) => {
    let smallestOverlap = Infinity;
    let collisionNormalX = 0;
    let collisionNormalY = 0;

    [firstPolygon, secondPolygon].forEach((polygon) => {
      polygon.forEach((point, index) => {
        const nextPoint = polygon[(index + 1) % polygon.length];
        const edgeX = nextPoint.x - point.x;
        const edgeY = nextPoint.y - point.y;
        const edgeLength = Math.hypot(edgeX, edgeY);
        const axisX = -edgeY / edgeLength;
        const axisY = edgeX / edgeLength;
        const firstProjection = projectPolygon(firstPolygon, axisX, axisY);
        const secondProjection = projectPolygon(secondPolygon, axisX, axisY);
        const overlap = Math.min(firstProjection.maximum, secondProjection.maximum)
          - Math.max(firstProjection.minimum, secondProjection.minimum);

        if (overlap <= 0) {
          smallestOverlap = -1;
          return;
        }

        if (smallestOverlap >= 0 && overlap < smallestOverlap) {
          smallestOverlap = overlap;
          collisionNormalX = axisX;
          collisionNormalY = axisY;
        }
      });
    });

    if (smallestOverlap <= 0) {
      return null;
    }

    const centerDeltaX = (second.x + second.width / 2) - (first.x + first.width / 2);
    const centerDeltaY = (second.y + second.height / 2) - (first.y + first.height / 2);

    if (centerDeltaX * collisionNormalX + centerDeltaY * collisionNormalY < 0) {
      collisionNormalX *= -1;
      collisionNormalY *= -1;
    }

    return {
      normalX: collisionNormalX,
      normalY: collisionNormalY,
      overlap: smallestOverlap,
    };
  };

  const resolveCollision = (first, second, currentTime) => {
    const firstPolygons = collisionPolygons(first, currentTime);
    const secondPolygons = collisionPolygons(second, currentTime);
    let details = null;

    firstPolygons.forEach((firstPolygon) => {
      secondPolygons.forEach((secondPolygon) => {
        const currentDetails = collisionDetails(
          firstPolygon,
          secondPolygon,
          first,
          second
        );

        if (
          currentDetails
          && (!details || currentDetails.overlap > details.overlap)
        ) {
          details = currentDetails;
        }
      });
    });

    if (!details) {
      return;
    }

    const { normalX, normalY, overlap } = details;
    const correctionX = normalX * overlap * 0.5;
    const correctionY = normalY * overlap * 0.5;

    first.x = clamp(first.x - correctionX, 0, first.maxX);
    first.y = clamp(first.y - correctionY, 0, first.maxY);
    second.x = clamp(second.x + correctionX, 0, second.maxX);
    second.y = clamp(second.y + correctionY, 0, second.maxY);

    const relativeVelocityX = second.velocityX - first.velocityX;
    const relativeVelocityY = second.velocityY - first.velocityY;
    const closingSpeed = (
      relativeVelocityX * normalX + relativeVelocityY * normalY
    );

    if (closingSpeed >= 0) {
      return;
    }

    const impulseX = -closingSpeed * normalX;
    const impulseY = -closingSpeed * normalY;

    first.velocityX -= impulseX;
    first.velocityY -= impulseY;
    second.velocityX += impulseX;
    second.velocityY += impulseY;
  };

  const resolveCollisions = (currentTime) => {
    for (let pass = 0; pass < 3; pass += 1) {
      for (let firstIndex = 0; firstIndex < floaters.length; firstIndex += 1) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < floaters.length;
          secondIndex += 1
        ) {
          resolveCollision(
            floaters[firstIndex],
            floaters[secondIndex],
            currentTime
          );
        }
      }
    }
  };

  const render = (currentTime = window.performance.now()) => {
    floaters.forEach((floater) => {
      const rotation = rotationAt(floater, currentTime);

      floater.element.style.left = `${floater.x}px`;
      floater.element.style.top = `${floater.y}px`;
      floater.element.style.transform = `rotate(${rotation}deg)`;
    });
  };

  const animate = (currentTime) => {
    if (lastFrameTime === null) {
      lastFrameTime = currentTime;
    }

    const elapsedSeconds = Math.min((currentTime - lastFrameTime) / 1000, 0.05);

    floaters.forEach((floater) => {
      floater.x += floater.velocityX * elapsedSeconds;
      floater.y += floater.velocityY * elapsedSeconds;
      reflectPosition(floater);
    });

    resolveCollisions(currentTime);
    render(currentTime);
    lastFrameTime = currentTime;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (reducedMotion.matches || animationFrame !== null) {
      return;
    }

    floaters.forEach((floater) => measureBounds(floater, true));
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
      elements.forEach((element) => element.removeAttribute("style"));
      return;
    }

    start();
  };

  window.addEventListener("resize", () => {
    floaters.forEach((floater) => measureBounds(floater));
    render();
  });

  reducedMotion.addEventListener("change", handleMotionPreference);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      floaters.forEach((floater) => measureBounds(floater));
      render();
    });
  }

  start();
})();
