import { describe, expect, it } from "vitest";
import {
  clampSliderPercent,
  estimateResolution,
  formatBytes,
  isSupportedFile,
  outputFileName,
} from "../lib/format";

describe("formatBytes", () => {
  it("affiche les octets bruts sous 1 Kio", () => {
    expect(formatBytes(512)).toBe("512 o");
  });

  it("convertit en Kio et Mio", () => {
    expect(formatBytes(2048)).toBe("2 Kio");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3 Mio");
  });

  it("gère les valeurs invalides", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("isSupportedFile", () => {
  it.each(["photo.png", "IMAGE.JPG", "scan.jpeg", "dessin.webp"])("accepte %s", (name) => {
    expect(isSupportedFile(name)).toBe(true);
  });

  it.each(["anim.gif", "doc.pdf", "raw.tiff", "sans-extension"])("refuse %s", (name) => {
    expect(isSupportedFile(name)).toBe(false);
  });
});

describe("outputFileName", () => {
  it("ajoute le suffixe _upscaled_x2", () => {
    expect(outputFileName("chat.png", 2, "png")).toBe("chat_upscaled_x2.png");
  });

  it("ajoute le suffixe _upscaled_x4 et change d'extension", () => {
    expect(outputFileName("photo de vacances.jpeg", 4, "webp")).toBe(
      "photo de vacances_upscaled_x4.webp",
    );
  });

  it("gère un nom sans extension", () => {
    expect(outputFileName("capture", 2, "jpg")).toBe("capture_upscaled_x2.jpg");
  });
});

describe("estimateResolution", () => {
  it("multiplie largeur et hauteur par le facteur", () => {
    expect(estimateResolution(800, 600, 2)).toEqual({ width: 1600, height: 1200 });
    expect(estimateResolution(1024, 768, 4)).toEqual({ width: 4096, height: 3072 });
  });
});

describe("clampSliderPercent", () => {
  it("borne entre 0 et 100", () => {
    expect(clampSliderPercent(-10)).toBe(0);
    expect(clampSliderPercent(50)).toBe(50);
    expect(clampSliderPercent(150)).toBe(100);
  });

  it("retombe à 50 pour NaN", () => {
    expect(clampSliderPercent(Number.NaN)).toBe(50);
  });
});
