// Utilitaires purs (testés avec Vitest).

import type { OutputFormat, Scale } from "../types";

const EXTENSIONS_SUPPORTEES = [".png", ".jpg", ".jpeg", ".webp"];

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

/** Nom de sortie : <nom>_upscaled_x2.png / <nom>_upscaled_x4.webp… */
export function outputFileName(inputName: string, scale: Scale, format: OutputFormat): string {
  const dot = inputName.lastIndexOf(".");
  const stem = dot > 0 ? inputName.slice(0, dot) : inputName;
  return `${stem}_upscaled_x${scale}.${format}`;
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
