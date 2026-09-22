(() => {
  const carousels = document.querySelectorAll("[data-episode-carousel]");

  carousels.forEach((carousel) => {
    const viewport = carousel.querySelector(".episode-carousel-viewport");
    const cards = Array.from(carousel.querySelectorAll(".episode-card"));
    const previousButton = carousel.querySelector("[data-carousel-previous]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const status = carousel.querySelector("[data-carousel-status]");

    if (!viewport || cards.length === 0 || !previousButton || !nextButton) {
      return;
    }

    let selectedIndex = Math.max(
      0,
      cards.findIndex((card) => card.classList.contains("is-selected")),
    );

    const centerCard = (card) => {
      const left = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2;
      viewport.scrollTo({ left, behavior: "smooth" });
    };

    const selectCard = (nextIndex, { focus = false, announce = true } = {}) => {
      selectedIndex = Math.min(Math.max(nextIndex, 0), cards.length - 1);

      cards.forEach((card, index) => {
        const isSelected = index === selectedIndex;
        card.classList.toggle("is-selected", isSelected);
        card.tabIndex = isSelected ? 0 : -1;

        if (isSelected) {
          card.setAttribute("aria-current", "true");
        } else {
          card.removeAttribute("aria-current");
        }
      });

      previousButton.disabled = selectedIndex === 0;
      nextButton.disabled = selectedIndex === cards.length - 1;

      const selectedCard = cards[selectedIndex];
      centerCard(selectedCard);

      if (focus) {
        selectedCard.focus({ preventScroll: true });
      }

      if (announce && status) {
        const name = selectedCard.dataset.episodeName || `episode ${selectedIndex + 1}`;
        status.textContent = `${name} selected, ${selectedIndex + 1} of ${cards.length}.`;
      }
    };

    previousButton.addEventListener("click", () => {
      selectCard(selectedIndex - 1, { focus: true });
    });

    nextButton.addEventListener("click", () => {
      selectCard(selectedIndex + 1, { focus: true });
    });

    cards.forEach((card, index) => {
      card.addEventListener("click", () => {
        if (index !== selectedIndex) {
          selectCard(index);
        }
      });

      card.addEventListener("focus", () => {
        if (index !== selectedIndex) {
          selectCard(index);
        }
      });

      card.addEventListener("keydown", (event) => {
        if (event.target !== card) {
          return;
        }

        let nextIndex = selectedIndex;

        if (event.key === "ArrowLeft") {
          nextIndex -= 1;
        } else if (event.key === "ArrowRight") {
          nextIndex += 1;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = cards.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        selectCard(nextIndex, { focus: true });
      });
    });

    carousel.classList.add("is-enhanced");
    selectCard(selectedIndex, { announce: false });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => {
        centerCard(cards[selectedIndex]);
      });
      resizeObserver.observe(viewport);
    }
  });
})();
