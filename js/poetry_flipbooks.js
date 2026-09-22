(() => {
  const books = document.querySelectorAll("[data-poetry-flipbook]");

  if (!books.length) {
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 600px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const pageGroups = (pageCount, isMobile) => {
    if (isMobile) {
      return Array.from({ length: pageCount }, (_value, index) => [index]);
    }

    const groups = [[0]];
    for (let pageIndex = 1; pageIndex < pageCount - 1; pageIndex += 2) {
      groups.push([pageIndex, pageIndex + 1].filter((index) => index < pageCount - 1));
    }
    if (pageCount > 1) {
      groups.push([pageCount - 1]);
    }
    return groups;
  };

  const describeGroup = (group, pageCount) => {
    if (group.length === 1) {
      return `page ${group[0] + 1} of ${pageCount}`;
    }
    return `pages ${group[0] + 1}–${group[group.length - 1] + 1} of ${pageCount}`;
  };

  books.forEach((book) => {
    const fallbackImages = Array.from(book.querySelectorAll("[data-poetry-page]"));
    const stage = book.querySelector("[data-poetry-stage]");
    const spreadHost = book.querySelector("[data-poetry-spread]");
    const previousButtons = book.querySelectorAll('[data-poetry-action="previous"]');
    const nextButtons = book.querySelectorAll('[data-poetry-action="next"]');
    const counter = book.querySelector("[data-poetry-counter]");
    const status = book.querySelector("[data-poetry-status]");
    const title = book.dataset.bookTitle || "Poetry series";

    if (!fallbackImages.length || !stage || !spreadHost || !previousButtons.length || !nextButtons.length) {
      return;
    }

    const pages = fallbackImages.map((image) => ({
      src: image.currentSrc || image.src,
      width: image.getAttribute("width") || "1210",
      height: image.getAttribute("height") || "1870",
    }));
    let groups = pageGroups(pages.length, mobileQuery.matches);
    let groupIndex = 0;
    let isTransitioning = false;

    const makeImage = (pageIndex, className) => {
      const image = document.createElement("img");
      image.className = className;
      image.src = pages[pageIndex].src;
      image.alt = "";
      image.width = Number(pages[pageIndex].width);
      image.height = Number(pages[pageIndex].height);
      image.draggable = false;
      return image;
    };

    const makeSpread = (group) => {
      const spread = document.createElement("div");
      spread.className = `poetry-flipbook-spread poetry-flipbook-spread--${group.length === 1 ? "single" : "double"}`;
      spread.setAttribute("aria-hidden", "true");
      group.forEach((pageIndex) => {
        spread.append(makeImage(pageIndex, "poetry-flipbook-page"));
      });
      return spread;
    };

    const updateControls = () => {
      const atBeginning = groupIndex === 0;
      const atEnd = groupIndex === groups.length - 1;
      previousButtons.forEach((button) => {
        button.disabled = atBeginning || isTransitioning;
      });
      nextButtons.forEach((button) => {
        button.disabled = atEnd || isTransitioning;
      });

      const description = describeGroup(groups[groupIndex], pages.length);
      if (counter) {
        counter.textContent = description;
      }
      if (status) {
        status.textContent = `${title}: showing ${description}.`;
      }
    };

    const transitionGeometry = (currentGroup, nextGroup) => {
      if (mobileQuery.matches) {
        return "mobile";
      }
      if (currentGroup[0] === 0 || nextGroup[0] === 0) {
        return "open";
      }
      if (
        currentGroup[currentGroup.length - 1] === pages.length - 1
        || nextGroup[nextGroup.length - 1] === pages.length - 1
      ) {
        return "close";
      }
      return "turn";
    };

    const makeTurningLeaf = (direction, geometry, frontPage, backPage) => {
      const leaf = document.createElement("div");
      leaf.className = "poetry-flipbook-leaf";
      leaf.dataset.direction = direction;
      leaf.dataset.geometry = geometry;
      leaf.setAttribute("aria-hidden", "true");

      const front = document.createElement("div");
      front.className = "poetry-flipbook-leaf-face poetry-flipbook-leaf-face--front";
      const back = document.createElement("div");
      back.className = "poetry-flipbook-leaf-face poetry-flipbook-leaf-face--back";

      front.append(makeImage(frontPage, "poetry-flipbook-page"));
      back.append(makeImage(backPage, "poetry-flipbook-page"));
      leaf.append(front, back);
      return leaf;
    };

    const makeTransitionPage = (pageIndex, side) => {
      return makeImage(
        pageIndex,
        `poetry-flipbook-page poetry-flipbook-transition-page poetry-flipbook-transition-page--${side}`,
      );
    };

    const makeDesktopTransition = (direction, currentGroup, nextGroup) => {
      const geometry = transitionGeometry(currentGroup, nextGroup);
      const scene = document.createElement("div");
      scene.className = "poetry-flipbook-transition";
      scene.dataset.direction = direction;
      scene.dataset.geometry = geometry;
      scene.setAttribute("aria-hidden", "true");

      let frontPage;
      let backPage;

      if (geometry === "open") {
        const spread = direction === "forward" ? nextGroup : currentGroup;
        const cover = direction === "forward" ? currentGroup : nextGroup;
        frontPage = cover[0];
        backPage = spread[0];
        scene.append(makeTransitionPage(spread[1], "right"));
      } else if (geometry === "close") {
        const spread = direction === "forward" ? currentGroup : nextGroup;
        const finalPage = direction === "forward" ? nextGroup : currentGroup;
        frontPage = spread[1];
        backPage = finalPage[0];
        scene.append(makeTransitionPage(spread[0], "left"));
      } else {
        const earlierSpread = direction === "forward" ? currentGroup : nextGroup;
        const laterSpread = direction === "forward" ? nextGroup : currentGroup;
        frontPage = earlierSpread[1];
        backPage = laterSpread[0];
        scene.append(
          makeTransitionPage(earlierSpread[0], "left"),
          makeTransitionPage(laterSpread[1], "right"),
        );
      }

      scene.append(makeTurningLeaf(direction, geometry, frontPage, backPage));
      return scene;
    };

    const makeMobileTransition = (direction, currentGroup, nextGroup) => {
      const frontPage = direction === "forward" ? currentGroup[0] : nextGroup[0];
      const backPage = direction === "forward" ? nextGroup[0] : currentGroup[0];
      return makeTurningLeaf(direction, "mobile", frontPage, backPage);
    };

    const finishTransition = (transitionElement) => {
      transitionElement.remove();
      spreadHost.hidden = false;
      isTransitioning = false;
      updateControls();
    };

    const showGroup = (nextIndex, direction, animate = true) => {
      if (isTransitioning || nextIndex < 0 || nextIndex >= groups.length || nextIndex === groupIndex) {
        return;
      }

      const currentGroup = groups[groupIndex];
      const nextGroup = groups[nextIndex];
      const nextSpread = makeSpread(nextGroup);
      const shouldAnimate = animate && !reducedMotion.matches;

      groupIndex = nextIndex;
      isTransitioning = shouldAnimate;
      spreadHost.replaceChildren(nextSpread);
      updateControls();

      if (!shouldAnimate) {
        spreadHost.hidden = false;
        return;
      }

      const transitionElement = mobileQuery.matches
        ? makeMobileTransition(direction, currentGroup, nextGroup)
        : makeDesktopTransition(direction, currentGroup, nextGroup);
      spreadHost.hidden = true;
      stage.append(transitionElement);
      transitionElement.addEventListener(
        "animationend",
        () => finishTransition(transitionElement),
        { once: true },
      );
      window.setTimeout(() => {
        if (transitionElement.isConnected) {
          finishTransition(transitionElement);
        }
      }, 950);
    };

    const previous = () => showGroup(groupIndex - 1, "backward");
    const next = () => showGroup(groupIndex + 1, "forward");
    previousButtons.forEach((button) => button.addEventListener("click", previous));
    nextButtons.forEach((button) => button.addEventListener("click", next));

    const navigateWithArrowKey = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      if (event.key === "ArrowLeft") {
        previous();
      } else {
        next();
      }
    };

    book.addEventListener("keydown", navigateWithArrowKey);

    document.addEventListener("keydown", (event) => {
      if (
        event.defaultPrevented
        || !book.classList.contains("is-selected")
        || book.contains(event.target)
      ) {
        return;
      }

      navigateWithArrowKey(event);
    });

    const handleLayoutChange = () => {
      const currentPage = groups[groupIndex][0];
      stage.querySelector(".poetry-flipbook-transition, .poetry-flipbook-leaf")?.remove();
      isTransitioning = false;
      spreadHost.hidden = false;
      groups = pageGroups(pages.length, mobileQuery.matches);
      const containingIndex = groups.findIndex((group) => group.includes(currentPage));
      groupIndex = containingIndex >= 0 ? containingIndex : 0;
      spreadHost.replaceChildren(makeSpread(groups[groupIndex]));
      updateControls();
    };

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleLayoutChange);
    } else {
      mobileQuery.addListener(handleLayoutChange);
    }

    spreadHost.replaceChildren(makeSpread(groups[groupIndex]));
    book.classList.add("poetry-flipbook--enhanced");
    updateControls();
  });
})();
