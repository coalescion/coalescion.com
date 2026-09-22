(() => {
  const player = document.querySelector("#part-ii-player");
  const passwordCue = document.querySelector("#program-password-cue");
  const access = document.querySelector(".program-access");
  const library = document.querySelector("#collage-library-content");
  const overlay = document.querySelector("#program-lock-overlay");
  const lockOptions = document.querySelector(".program-lock-options");
  const lockButtons = Array.from(document.querySelectorAll("[data-program-lock-button]"));
  const lockImages = Array.from(document.querySelectorAll("[data-program-lock-image]"));
  const form = document.querySelector("#program-password-form");
  const input = document.querySelector("#program-password-input");
  const message = document.querySelector("#program-password-message");
  const accessStatus = document.querySelector("#program-access-status");

  if (
    !player
    || !passwordCue
    || !access
    || !library
    || !overlay
    || !lockOptions
    || lockButtons.length !== 3
    || lockImages.length !== 3
    || !form
    || !input
    || !message
    || !accessStatus
  ) {
    return;
  }

  const PASSWORD = "wandering";
  const STORAGE_KEY = "soap-program-unlocked";
  const PASSWORD_WINDOW_SECONDS = 90;
  const REQUIRED_WATCH_SECONDS = 5;

  // Unlock animation timing knobs, in milliseconds.
  const LOCKED_IMAGE_DURATION = 500;
  const UNLOCKED_IMAGE_DURATION = 800;
  const OVERLAY_FADE_DURATION = 300;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let passwordRevealed = false;
  let isUnlocking = false;
  let activeLockButton = null;
  let isPlaying = false;
  let isSeeking = false;
  let previousPlaybackTime = null;
  let eligibleWatchSeconds = 0;

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
      // The ritual still completes when storage is unavailable.
    }
  };

  const revealPassword = () => {
    if (passwordRevealed) {
      return;
    }

    passwordRevealed = true;
    passwordCue.hidden = false;
  };

  const readPlaybackTime = () => {
    const currentTime = Number(player.currentTime);
    return Number.isFinite(currentTime) ? currentTime : null;
  };

  const recordEligiblePlayback = () => {
    const currentTime = readPlaybackTime();
    const duration = Number(player.duration);

    if (currentTime === null || !Number.isFinite(duration) || duration <= 0) {
      previousPlaybackTime = currentTime;
      return;
    }

    const previousTime = previousPlaybackTime;
    previousPlaybackTime = currentTime;

    if (
      passwordRevealed
      || !isPlaying
      || isSeeking
      || previousTime === null
      || currentTime <= previousTime
    ) {
      return;
    }

    const windowStart = Math.max(0, duration - PASSWORD_WINDOW_SECONDS);
    const eligibleStart = Math.max(previousTime, windowStart);
    const eligibleEnd = Math.min(currentTime, duration);

    if (eligibleEnd <= eligibleStart) {
      return;
    }

    eligibleWatchSeconds += eligibleEnd - eligibleStart;

    if (eligibleWatchSeconds >= REQUIRED_WATCH_SECONDS) {
      revealPassword();
    }
  };

  const beginTrackingPlayback = () => {
    isPlaying = true;
    previousPlaybackTime = readPlaybackTime();
  };

  const stopTrackingPlayback = () => {
    recordEligiblePlayback();
    isPlaying = false;
    previousPlaybackTime = null;
  };

  const showPasswordForm = (event) => {
    activeLockButton = event.currentTarget;
    lockOptions.hidden = true;
    form.hidden = false;
    input.focus();
  };

  const hidePasswordForm = () => {
    if (form.hidden || isUnlocking) {
      return;
    }

    form.hidden = true;
    lockOptions.hidden = false;
    message.textContent = "";
    activeLockButton?.focus();
  };

  const finishUnlock = () => {
    overlay.hidden = true;
    overlay.classList.remove("is-unlocking", "is-disappearing");
    access.dataset.programAccess = "unlocked";
    library.inert = false;
  };

  const beginUnlock = () => {
    if (isUnlocking) {
      return;
    }

    isUnlocking = true;
    storeUnlock();
    form.hidden = true;
    lockOptions.hidden = false;
    lockImages.forEach((lockImage) => {
      lockImage.src = "../images/password_lock.png";
    });
    lockButtons.forEach((lockButton) => {
      lockButton.disabled = true;
    });
    overlay.classList.add("is-unlocking");

    const lockedImageDuration = reducedMotion.matches ? 20 : LOCKED_IMAGE_DURATION;
    const unlockedImageDuration = reducedMotion.matches ? 20 : UNLOCKED_IMAGE_DURATION;
    const fadeDuration = reducedMotion.matches ? 20 : OVERLAY_FADE_DURATION;
    overlay.style.setProperty("--program-lock-fade-duration", `${fadeDuration}ms`);

    window.setTimeout(() => {
      lockImages.forEach((lockImage) => {
        lockImage.src = "../images/password_unlocked.png";
      });
      accessStatus.textContent = "The collage program and poetry series are unlocked.";

      window.setTimeout(() => {
        overlay.classList.add("is-disappearing");
        window.setTimeout(finishUnlock, fadeDuration);
      }, unlockedImageDuration);
    }, lockedImageDuration);
  };

  player.addEventListener("play", beginTrackingPlayback);
  player.addEventListener("playing", () => {
    isPlaying = true;
    previousPlaybackTime ??= readPlaybackTime();
  });
  player.addEventListener("pause", stopTrackingPlayback);
  player.addEventListener("ended", stopTrackingPlayback);
  player.addEventListener("seeking", () => {
    isSeeking = true;
    isPlaying = false;
    previousPlaybackTime = null;
  });
  player.addEventListener("seeked", () => {
    isSeeking = false;
    isPlaying = !player.paused && !player.ended;
    previousPlaybackTime = readPlaybackTime();
  });
  player.addEventListener("timeupdate", recordEligiblePlayback);

  if (readStoredUnlock()) {
    access.dataset.programAccess = "unlocked";
    library.inert = false;
    return;
  }

  access.dataset.programAccess = "locked";
  library.inert = true;
  overlay.hidden = false;

  lockButtons.forEach((lockButton) => {
    lockButton.addEventListener("click", showPasswordForm);
  });

  document.addEventListener("click", (event) => {
    if (
      form.hidden
      || form.contains(event.target)
      || lockButtons.some((lockButton) => lockButton.contains(event.target))
    ) {
      return;
    }

    hidePasswordForm();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const enteredPassword = input.value.trim().toLocaleLowerCase();

    if (enteredPassword === PASSWORD) {
      Array.from(form.elements).forEach((element) => {
        element.disabled = true;
      });
      beginUnlock();
      return;
    }

    message.textContent = "nah bruh.";
    input.select();
  });
})();
