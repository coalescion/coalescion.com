(() => {
  const trigger = document.querySelector(".viewing-note-trigger");
  const popup = document.querySelector("#viewing-note-popup");

  if (!trigger || !popup) {
    return;
  }

  trigger.addEventListener("click", () => {
    const isOpen = trigger.getAttribute("aria-expanded") === "true";

    trigger.setAttribute("aria-expanded", String(!isOpen));
    popup.hidden = isOpen;
  });
})();
