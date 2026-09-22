(() => {
  const grids = document.querySelectorAll(".performance-grid");
  const stacks = document.querySelectorAll(".performance-stack");

  const arrangeStack = (stack) => {
    const images = Array.from(stack.querySelectorAll("img"));

    images.forEach((image, index) => {
      image.style.setProperty("--stack-position", index);
      image.style.zIndex = String(images.length - index);
    });

    const currentPage = Number(stack.dataset.currentPage || 1);
    stack.dataset.stackStatus = `${currentPage} / ${images.length}`;
  };

  const cycleStack = (stack, direction) => {
    const images = Array.from(stack.querySelectorAll("img"));
    const imageCount = images.length;
    const currentPage = Number(stack.dataset.currentPage || 1);

    if (imageCount < 2) {
      return;
    }

    if (direction < 0) {
      stack.prepend(images[imageCount - 1]);
      stack.dataset.currentPage = String(((currentPage - 2 + imageCount) % imageCount) + 1);
    } else {
      stack.append(images[0]);
      stack.dataset.currentPage = String((currentPage % imageCount) + 1);
    }

    arrangeStack(stack);
  };

  stacks.forEach((stack) => {
    stack.dataset.currentPage = "1";
    arrangeStack(stack);

    stack.addEventListener("click", () => {
      const item = stack.closest(".performance-item");

      if (!item?.classList.contains("is-expanded")) {
        return;
      }

      cycleStack(stack, 1);
    });

    stack.addEventListener("keydown", (event) => {
      const item = stack.closest(".performance-item");

      if (item?.classList.contains("is-expanded")
        || !["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      cycleStack(stack, event.key === "ArrowLeft" ? -1 : 1);
    });
  });

  grids.forEach((grid) => {
    const items = Array.from(grid.querySelectorAll(":scope > .performance-item"));
    const closeButton = document.createElement("button");
    let expandedItem = null;

    closeButton.className = "performance-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Return to the full gallery grid");

    const closeImage = document.createElement("img");
    closeImage.src = "../images/back_arrow_2.png";
    closeImage.alt = "";
    closeButton.append(closeImage);

    const closeItem = () => {
      if (!expandedItem) {
        return;
      }

      const previousItem = expandedItem;
      previousItem.querySelector("video")?.pause();
      previousItem.classList.remove("is-expanded");
      previousItem.setAttribute("aria-expanded", "false");
      grid.classList.remove("has-expanded-item");
      closeButton.remove();
      expandedItem = null;
      previousItem.focus({ preventScroll: true });
    };

    const expandItem = (item) => {
      if (expandedItem) {
        return;
      }

      expandedItem = item;
      item.classList.add("is-expanded");
      item.setAttribute("aria-expanded", "true");
      grid.classList.add("has-expanded-item");
      item.append(closeButton);
      closeButton.focus({ preventScroll: true });
    };

    items.forEach((item) => {
      item.setAttribute("aria-expanded", "false");

      if (!item.querySelector("button, video")) {
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", "Expand this gallery image");
      } else {
        item.tabIndex = -1;
      }

      item.addEventListener("click", (event) => {
        const closeWasClicked = event.target instanceof Element
          && event.target.closest(".performance-close");

        if (closeWasClicked || item === expandedItem) {
          return;
        }

        expandItem(item);
      });

      item.addEventListener("keydown", (event) => {
        if (event.target !== item || !["Enter", " "].includes(event.key)) {
          return;
        }

        event.preventDefault();
        expandItem(item);
      });
    });

    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeItem();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && expandedItem) {
        closeItem();
        return;
      }

      const expandedStack = expandedItem?.querySelector(".performance-stack");

      if (expandedStack && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        cycleStack(expandedStack, event.key === "ArrowLeft" ? -1 : 1);
      }
    });
  });
})();
