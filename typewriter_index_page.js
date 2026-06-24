// ms between each character typed, ADJUST AS NEEDED
const sleeptime = 40;
const initialStartDelay = 1000;
const typewriterSelector = "#descrip1, #descrip2, #descrip3, #poem";

const sentencePauseTime = 300;
const wordPauseMap = {
  // "happiness, love, and success": 600,
  // "at your own pace": 500,
  // "unique paths to the top": 700,
};

const paragraphPauseDefault = 1000;
const paragraphPauseMap = {
  descrip1: 3000,
  descrip2: 3000,
  descrip3: 1000,
};

const characterDelay = (elementID) => elementID === "poem" ? 18 : sleeptime;

let typewriterInstance;

const buildTypewriter = () => {
  if (!window.TypewriterCore) {
    return null;
  }
  if (!typewriterInstance) {
    typewriterInstance = window.TypewriterCore.createTypewriter({
      selector: typewriterSelector,
      charDelay: characterDelay,
      sentencePauseTime,
      wordPauseMap,
      paragraphDelayDefault: paragraphPauseDefault,
      paragraphDelayMap: paragraphPauseMap,
    });
  }
  return typewriterInstance;
};

window.startTypewriterEffect = function startTypewriterEffect() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(typewriterSelector).forEach((element) => {
      element.classList.remove("hidden");
    });
    return;
  }

  const instance = buildTypewriter();
  if (!instance) {
    setTimeout(startTypewriterEffect, 50);
    return;
  }
  setTimeout(() => {
    instance.start();
  }, initialStartDelay);
};
