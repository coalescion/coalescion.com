(() => {
  const poemSvgSelector = ".poem-image[data-svg-source-font-size]";
  const defaultTargetFontSize = "1.2rem";

  const measureLengthInPx = (length, contextElement) => {
    const value = length.trim();

    if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      return Number.parseFloat(value);
    }

    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.width = value;
    probe.style.height = "0";
    probe.style.fontSize = window.getComputedStyle(contextElement).fontSize;

    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();

    return width;
  };

  const fontSizeKnobFor = (image) => {
    const styles = window.getComputedStyle(image);
    const cssFontSize = styles.getPropertyValue("--poem-svg-font-size").trim();
    return image.dataset.svgTargetFontSize || cssFontSize || defaultTargetFontSize;
  };

  const scalePoemSvg = (image) => {
    if (!image.naturalWidth) {
      return;
    }

    const sourceFontSize = measureLengthInPx(
      image.dataset.svgSourceFontSize,
      image
    );
    const targetFontSize = measureLengthInPx(fontSizeKnobFor(image), image);

    if (!sourceFontSize || !targetFontSize) {
      return;
    }

    const scale = targetFontSize / sourceFontSize;
    image.style.setProperty(
      "--poem-svg-rendered-width",
      `${image.naturalWidth * scale}px`
    );
    image.dataset.svgScale = scale.toFixed(6).replace(/\.?0+$/, "");
  };

  const initializePoemSvg = (image) => {
    if (image.complete && image.naturalWidth) {
      scalePoemSvg(image);
      return;
    }

    image.addEventListener("load", () => scalePoemSvg(image), { once: true });
  };

  const scaleAllPoemSvgs = () => {
    document.querySelectorAll(poemSvgSelector).forEach(initializePoemSvg);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scaleAllPoemSvgs);
  } else {
    scaleAllPoemSvgs();
  }

  window.scalePoemSvgs = scaleAllPoemSvgs;

  window.addEventListener("resize", scaleAllPoemSvgs);
})();
