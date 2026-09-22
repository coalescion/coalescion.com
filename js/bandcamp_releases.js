(() => {
  const releaseGroup = document.querySelector("[data-bandcamp-releases]");

  if (!releaseGroup) {
    return;
  }

  const releaseButtons = [...releaseGroup.querySelectorAll("[data-bandcamp-release]")];
  const playerRegions = [...releaseGroup.querySelectorAll("[data-bandcamp-player-region]")];
  const sectionTrigger = document.querySelector('[aria-controls="collage-audio-panel"]');
  let activeButton = null;

  const clearPlayerRegion = (region) => {
    region.replaceChildren();
    region.hidden = true;
  };

  const resetPlayers = () => {
    playerRegions.forEach(clearPlayerRegion);
    releaseButtons.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
    activeButton = null;
  };

  const openPlayer = (button) => {
    const regionId = button.getAttribute("aria-controls");
    const region = regionId ? document.getElementById(regionId) : null;
    const playerSrc = button.dataset.playerSrc;
    const playerTitle = button.dataset.playerTitle;

    if (!region || !playerSrc || !playerTitle) {
      return;
    }

    resetPlayers();

    const player = document.createElement("iframe");
    player.className = "bandcamp-player";
    player.src = playerSrc;
    player.title = playerTitle;
    player.width = "100%";
    player.height = "300";
    player.loading = "lazy";
    player.setAttribute("allow", "autoplay");

    region.append(player);
    region.hidden = false;
    button.setAttribute("aria-expanded", "true");
    activeButton = button;
  };

  releaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button === activeButton) {
        resetPlayers();
        return;
      }

      openPlayer(button);
    });
  });

  if (sectionTrigger) {
    const sectionObserver = new MutationObserver(() => {
      if (sectionTrigger.getAttribute("aria-expanded") === "false") {
        resetPlayers();
      }
    });

    sectionObserver.observe(sectionTrigger, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });
  }
})();
