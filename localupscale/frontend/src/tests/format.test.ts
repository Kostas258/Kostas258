import { describe, expect, it } from "vitest";
import {
  clampSliderPercent,
  estimateResolution,
  formatBytes,
  isSupportedFile,
  outputFileName,
  sanitizeStem,
  uniqueOutputName,
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

describe("outputFileName — suffixe distinct par mode", () => {
  it("utilise _upscaled_xN pour l'agrandissement IA", () => {
    expect(outputFileName("chat.png", 2, "png", "ia")).toBe("chat_upscaled_x2.png");
    expect(outputFileName("chat.png", 4, "webp", "ia")).toBe("chat_upscaled_x4.webp");
  });

  it("utilise _redim_xN pour le redimensionnement sans IA", () => {
    const nom = outputFileName("chat.png", 4, "png", "classique");
    expect(nom).toBe("chat_redim_x4.png");
    expect(nom).not.toContain("upscaled");
  });

  it("gère un nom sans extension", () => {
    expect(outputFileName("capture", 2, "jpg", "ia")).toBe("capture_upscaled_x2.jpg");
  });

  it("préserve les points internes d'un nom composé", () => {
    expect(outputFileName("photo.finale.v2.jpeg", 2, "png", "ia")).toBe(
      "photo.finale.v2_upscaled_x2.png",
    );
  });
});

describe("sanitizeStem", () => {
  it.each([
    ["photo:test", "photo_test"],
    ['gui"llemets', "gui_llemets"],
    ["chemin/interdit", "chemin_interdit"],
    ["pipe|etoile*", "pipe_etoile_"],
    ["fin en points...", "fin en points"],
    ["   ", "image"],
    ["CON", "CON_"],
  ])("nettoie %s", (entree, attendu) => {
    expect(sanitizeStem(entree)).toBe(attendu);
  });

  it("préserve accents et espaces", () => {
    expect(sanitizeStem("été à Nîmes")).toBe("été à Nîmes");
  });

  it("remplace les caractères de contrôle", () => {
    expect(sanitizeStem("a\u0001b")).toBe("a_b");
  });

  it("tronque les noms démesurés", () => {
    expect(sanitizeStem("a".repeat(400)).length).toBe(150);
  });
});

describe("uniqueOutputName — collisions", () => {
  it("renvoie le nom simple quand rien n'est pris", () => {
    expect(uniqueOutputName("image.png", 4, "png", "ia", [])).toBe("image_upscaled_x4.png");
  });

  it("ajoute _1 puis _2 en cas de collision", () => {
    const pris = ["image_upscaled_x4.png"];
    expect(uniqueOutputName("image.png", 4, "png", "ia", pris)).toBe("image_upscaled_x4_1.png");
    expect(
      uniqueOutputName("image.png", 4, "png", "ia", [...pris, "image_upscaled_x4_1.png"]),
    ).toBe("image_upscaled_x4_2.png");
  });

  it("distingue deux sources homonymes d'un même lot", () => {
    const attribues: string[] = [];
    attribues.push(uniqueOutputName("photo.png", 2, "png", "ia", attribues));
    attribues.push(uniqueOutputName("photo.png", 2, "png", "ia", attribues));
    expect(attribues).toEqual(["photo_upscaled_x2.png", "photo_upscaled_x2_1.png"]);
    expect(new Set(attribues).size).toBe(2);
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
