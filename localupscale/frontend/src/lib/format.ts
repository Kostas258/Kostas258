// Utilitaires purs (testés avec Vitest).
// Le nommage reproduit celui du backend (backend/app/services/files.py) afin
// que l'aperçu affiché corresponde au fichier réellement produit.

import type { OutputFormat, ProcessingMode, Scale } from "../types";

const EXTENSIONS_SUPPORTEES = [".png", ".jpg", ".jpeg", ".webp"];

/** Suffixe distinct par mode : un fichier sans IA ne porte jamais le nom
 *  d'un résultat Real-ESRGAN. */
const SUFFIXES_MODE: Record<ProcessingMode, string> = {
  ia: "upscaled",
  classique: "redim",
};

// Caractères refusés par Windows. Les accents et les espaces sont
// volontairement conservés ; les caractères de contrôle sont traités à part
// (par code de caractère) pour ne pas en écrire dans ce fichier source.
const CARACTERES_INTERDITS = /[<>:"/\\|?*]/g;
const NOMS_RESERVES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const LONGUEUR_MAX_BASE = 150;

/** Formate un poids en octets de façon lisible (fr-FR). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Kio", "Mio", "Gio"];
  let value = bytes;
  let unit = "o";
  for (const u of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = u;
  }
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`;
}

/** Le fichier est-il dans un format accepté (PNG, JPG, JPEG, WebP) ? */
export function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return EXTENSIONS_SUPPORTEES.some((ext) => lower.endsWith(ext));
}

/** Rend un nom sûr sans le dénaturer : accents, espaces et points internes
 *  sont conservés, seuls les caractères interdits sont remplacés. */
export function sanitizeStem(stem: string): string {
  const sansControle = Array.from(stem)
    .map((c) => ((c.codePointAt(0) ?? 32) < 32 ? "_" : c))
    .join("");
  let nettoye = sansControle.replace(CARACTERES_INTERDITS, "_").replace(/[ .]+$/, "");
  if (NOMS_RESERVES.test(nettoye)) nettoye = `${nettoye}_`;
  if (nettoye === "") nettoye = "image";
  return nettoye.slice(0, LONGUEUR_MAX_BASE);
}

/** Base du nom de sortie, sans extension : <nom>_upscaled_x2 / <nom>_redim_x2. */
export function outputBaseName(inputName: string, scale: Scale, mode: ProcessingMode): string {
  const dot = inputName.lastIndexOf(".");
  const stem = dot > 0 ? inputName.slice(0, dot) : inputName;
  return `${sanitizeStem(stem)}_${SUFFIXES_MODE[mode]}_x${scale}`;
}

/** Nom de sortie complet. */
export function outputFileName(
  inputName: string,
  scale: Scale,
  format: OutputFormat,
  mode: ProcessingMode = "ia",
): string {
  return `${outputBaseName(inputName, scale, mode)}.${format}`;
}

/** Nom unique face aux noms déjà pris : base.png, base_1.png, base_2.png… */
export function uniqueOutputName(
  inputName: string,
  scale: Scale,
  format: OutputFormat,
  mode: ProcessingMode,
  taken: Iterable<string>,
): string {
  const pris = new Set(taken);
  const base = outputBaseName(inputName, scale, mode);
  let candidat = `${base}.${format}`;
  let compteur = 1;
  while (pris.has(candidat)) {
    candidat = `${base}_${compteur}.${format}`;
    compteur += 1;
  }
  return candidat;
}

/** Résolution finale estimée. */
export function estimateResolution(
  width: number,
  height: number,
  scale: Scale,
): { width: number; height: number } {
  return { width: width * scale, height: height * scale };
}

/** Position du curseur de comparaison, bornée entre 0 et 100. */
export function clampSliderPercent(value: number): number {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}
