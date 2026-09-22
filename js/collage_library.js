(() => {
  const access = document.querySelector(".program-access");
  const library = document.querySelector("#collage-library-content");

  if (!access || !library) {
    return;
  }

  const items = Array.from(library.querySelectorAll("[data-library-item]"));
  const status = library.querySelector("[data-library-focus-status]");
  let selectedItem = null;

  if (items.length !== 3) {
    return;
  }

  const itemTitle = (item) => item.dataset.libraryTitle || "Selected publication";

  const selectItem = (item) => {
    if (selectedItem || !items.includes(item)) {
      return;
    }

    selectedItem = item;
    library.classList.add("is-focused");
    item.classList.add("is-selected");
    items.forEach((candidate) => {
      const isSelected = candidate === item;
      candidate.inert = !isSelected;
      candidate.setAttribute("aria-hidden", String(!isSelected));
    });

    if (status) {
      status.textContent = `${itemTitle(item)} expanded. The other publications are hidden.`;
    }

    try {
      item.focus({ preventScroll: true });
    } catch {
      item.focus();
    }
  };

  const showAll = ({ restoreFocus = true } = {}) => {
    if (!selectedItem) {
      return;
    }

    const previousSelection = selectedItem;
    selectedItem = null;
    library.classList.remove("is-focused");
    items.forEach((item) => {
      item.classList.remove("is-selected");
      item.inert = false;
      item.removeAttribute("aria-hidden");
    });

    if (status) {
      status.textContent = "All three publications are visible.";
    }

    if (restoreFocus) {
      try {
        previousSelection.focus({ preventScroll: true });
      } catch {
        previousSelection.focus();
      }
    }
  };

  document.addEventListener("click", (event) => {
    if (!selectedItem || selectedItem.contains(event.target)) {
      return;
    }

    showAll({ restoreFocus: false });
  }, true);

  library.addEventListener("click", (event) => {
    const returnButton = event.target.closest("[data-library-return]");
    if (returnButton) {
      event.preventDefault();
      event.stopPropagation();
      showAll();
      return;
    }

    if (selectedItem) {
      return;
    }

    const item = event.target.closest("[data-library-item]");
    if (!item || !library.contains(item)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectItem(item);
  }, true);

  library.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedItem) {
      event.preventDefault();
      event.stopPropagation();
      showAll();
      return;
    }

    if (selectedItem || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    const item = event.target.closest("[data-library-item]");
    if (!item || !library.contains(item)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectItem(item);
  }, true);

  access.classList.add("program-access--library-enhanced");
  library.classList.add("collage-library-content--enhanced");
})();
