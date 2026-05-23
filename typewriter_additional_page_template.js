// ms between each character typed, ADJUST AS NEEDED
const sleeptime = 40;

const sentencePauseTime = 300;
const wordPauseMap = {
  // "happiness, love, and success": 600,
  // "at your own pace": 500,
  // "unique paths to the top": 700,
};

const paragraphPauseDefault = 1000;
const paragraphPauseMap = {
  descrip1: 1400,
  descrip2: 1800,
};

let typewriterInstance;

const buildTypewriter = () => {
  if (!window.TypewriterCore) {
    return null;
  }
  if (!typewriterInstance) {
    typewriterInstance = window.TypewriterCore.createTypewriter({
      selector: 'p[id^="descrip"]',
      charDelay: sleeptime,
      sentencePauseTime,
      wordPauseMap,
      paragraphDelayDefault: paragraphPauseDefault,
      paragraphDelayMap: paragraphPauseMap,
    });
  }
  return typewriterInstance;
};

window.startTypewriterEffect = function startTypewriterEffect() {
  const instance = buildTypewriter();
  if (!instance) {
    setTimeout(startTypewriterEffect, 50);
    return;
  }
  instance.start();
};
