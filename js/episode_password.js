(() => {
  const panel = document.querySelector("#episodes-panel");
  const cards = Array.from(document.querySelectorAll(".episode-card"));
  const accessStatus = document.querySelector("#episodes-access-status");

  if (!panel || cards.length === 0 || !accessStatus) {
    return;
  }

  const PASSWORD = "wandering";
  const STORAGE_KEY = "soap-episodes-unlocked";

  // Keep the episode ritual in step with the collage-program unlock animation.
  const LOCKED_IMAGE_DURATION = 500;
  const UNLOCKED_IMAGE_DURATION = 800;
  const OVERLAY_FADE_DURATION = 300;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isUnlocking = false;

  const readStoredUnlock = () => {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  };

  const storeUnlock = () => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Unlocking still works when storage is unavailable.
    }
  };

  const setEpisodeContentLocked = (locked) => {
    panel.dataset.episodeAccess = locked ? "locked" : "unlocked";

    cards.forEach((card) => {
      const player = card.querySelector("mux-player");
      const description = card.querySelector(".episode-description");

      if (player) {
        player.toggleAttribute("inert", locked);
        if (locked) {
          player.setAttribute("aria-hidden", "true");
        } else {
          player.removeAttribute("aria-hidden");
        }
      }

      if (description) {
        if (locked) {
          description.setAttribute("aria-hidden", "true");
        } else {
          description.removeAttribute("aria-hidden");
        }
      }
    });
  };

  if (readStoredUnlock()) {
    setEpisodeContentLocked(false);
    accessStatus.textContent = "All episodes are unlocked.";
    return;
  }

  setEpisodeContentLocked(true);

  const closeOtherForms = (activeOverlay) => {
    panel.querySelectorAll(".episode-lock-overlay").forEach((overlay) => {
      if (overlay === activeOverlay) {
        return;
      }

      const button = overlay.querySelector(".program-lock-button");
      const form = overlay.querySelector(".episode-password-form");
      const message = overlay.querySelector(".program-password-message");

      if (button && form && message) {
        button.hidden = false;
        form.hidden = true;
        message.textContent = "";
      }
    });
  };

  const hidePasswordForm = (overlay) => {
    const button = overlay.querySelector(".program-lock-button");
    const form = overlay.querySelector(".episode-password-form");
    const message = overlay.querySelector(".program-password-message");

    if (!button || !form || !message || form.hidden || isUnlocking) {
      return;
    }

    button.hidden = false;
    form.hidden = true;
    message.textContent = "";
  };

  const finishUnlock = (overlays) => {
    setEpisodeContentLocked(false);
    overlays.forEach((overlay) => {
      overlay.hidden = true;
      overlay.classList.remove("is-unlocking", "is-disappearing");
    });
  };

  const beginUnlock = () => {
    if (isUnlocking) {
      return;
    }

    isUnlocking = true;
    storeUnlock();

    const overlays = Array.from(panel.querySelectorAll(".episode-lock-overlay"));
    const lockedImageDuration = reducedMotion.matches ? 20 : LOCKED_IMAGE_DURATION;
    const unlockedImageDuration = reducedMotion.matches ? 20 : UNLOCKED_IMAGE_DURATION;
    const fadeDuration = reducedMotion.matches ? 20 : OVERLAY_FADE_DURATION;

    overlays.forEach((overlay) => {
      const button = overlay.querySelector(".program-lock-button");
      const form = overlay.querySelector(".episode-password-form");
      const image = overlay.querySelector(".program-lock-image");

      if (form) {
        form.hidden = true;
      }
      if (button) {
        button.hidden = false;
        button.disabled = true;
      }
      if (image) {
        image.src = "../images/password_lock.png";
      }

      overlay.classList.add("is-unlocking");
      overlay.style.setProperty("--program-lock-fade-duration", `${fadeDuration}ms`);
    });

    window.setTimeout(() => {
      overlays.forEach((overlay) => {
        const image = overlay.querySelector(".program-lock-image");
        if (image) {
          image.src = "../images/password_unlocked.png";
        }
      });
      accessStatus.textContent = "All episodes are unlocked.";

      window.setTimeout(() => {
        overlays.forEach((overlay) => overlay.classList.add("is-disappearing"));
        window.setTimeout(() => finishUnlock(overlays), fadeDuration);
      }, unlockedImageDuration);
    }, lockedImageDuration);
  };

  cards.forEach((card, index) => {
    const playerFrame = card.querySelector(".collage-player");
    const episodeName = card.dataset.episodeName || `episode ${index + 1}`;

    if (!playerFrame) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "program-lock-overlay episode-lock-overlay";

    const lockButton = document.createElement("button");
    lockButton.className = "program-lock-button";
    lockButton.type = "button";
    lockButton.setAttribute("aria-label", `Enter the password to unlock all episodes from ${episodeName}`);

    const lockImage = document.createElement("img");
    lockImage.className = "program-lock-image";
    lockImage.src = "../images/password_lock.png";
    lockImage.alt = "";
    lockButton.append(lockImage);

    const form = document.createElement("form");
    form.className = "program-password-form episode-password-form";
    form.hidden = true;

    const inputId = `episode-password-input-${index + 1}`;
    const label = document.createElement("label");
    label.htmlFor = inputId;
    label.innerHTML = "password protected.<br>revealed after watching the collage film.";

    const fields = document.createElement("div");
    fields.className = "program-password-fields";

    const input = document.createElement("input");
    input.className = "program-password-input";
    input.id = inputId;
    input.name = "password";
    input.type = "password";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.required = true;

    const submit = document.createElement("button");
    submit.className = "program-password-submit";
    submit.type = "submit";
    submit.textContent = "open";

    const message = document.createElement("p");
    message.className = "program-password-message";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");

    fields.append(input, submit);
    form.append(label, fields, message);
    overlay.append(lockButton, form);
    playerFrame.append(overlay);

    lockButton.addEventListener("click", () => {
      closeOtherForms(overlay);
      lockButton.hidden = true;
      form.hidden = false;
      input.focus();
    });

    lockButton.addEventListener("keydown", (event) => {
      const carousel = card.closest("[data-episode-carousel]");
      let control;

      if (event.key === "ArrowLeft") {
        control = carousel?.querySelector("[data-carousel-previous]");
      } else if (event.key === "ArrowRight") {
        control = carousel?.querySelector("[data-carousel-next]");
      } else {
        return;
      }

      if (control && !control.disabled) {
        event.preventDefault();
        control.click();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (input.value.trim().toLocaleLowerCase() === PASSWORD) {
        Array.from(form.elements).forEach((element) => {
          element.disabled = true;
        });
        beginUnlock();
        return;
      }

      message.textContent = "nah bruh.";
      input.select();
    });
  });

  document.addEventListener("click", (event) => {
    const activeForm = panel.querySelector(".episode-password-form:not([hidden])");

    if (!activeForm || activeForm.contains(event.target)) {
      return;
    }

    const activeOverlay = activeForm.closest(".episode-lock-overlay");
    const activeButton = activeOverlay?.querySelector(".program-lock-button");

    if (!activeOverlay || activeButton?.contains(event.target)) {
      return;
    }

    hidePasswordForm(activeOverlay);
  });
})();
