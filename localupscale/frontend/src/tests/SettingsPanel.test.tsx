import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "../components/SettingsPanel";
import type { SystemInfo, UpscaleSettings } from "../types";

const REGLAGES: UpscaleSettings = {
  mode: "ia",
  scale: 2,
  model: "photo",
  face_enhance: false,
  output_format: "png",
  output_dir: "/sorties",
};

function systeme(overrides: Partial<SystemInfo> = {}): SystemInfo {
  return {
    ai_engine: "realesrgan",
    ai_engine_available: true,
    ai_engine_unavailable_reason: null,
    device: "cpu",
    cpu_fallback: true,
    cpu_fallback_warning: "Mode processeur : nettement plus lent.",
    face_enhance_available: true,
    face_enhance_unavailable_reason: null,
    classic_mode_label: "Redimensionnement classique — sans IA",
    classic_mode_warning: "Aucun détail n'est généré et le résultat n'est PAS un agrandissement par IA.",
    ai_disclaimer: "Les détails ajoutés par l'IA sont générés.",
    ...overrides,
  };
}

describe("SettingsPanel — option « Améliorer les visages »", () => {
  it("est décochée par défaut et activable quand GFPGAN est disponible", () => {
    render(<SettingsPanel settings={REGLAGES} system={systeme()} onChange={vi.fn()} />);
    const case_ = screen.getByLabelText(/Améliorer les visages/);
    expect(case_).not.toBeChecked();
    expect(case_).toBeEnabled();
  });

  it("est désactivée et justifiée quand GFPGAN manque", () => {
    render(
      <SettingsPanel
        settings={REGLAGES}
        system={systeme({
          face_enhance_available: false,
          face_enhance_unavailable_reason: "GFPGAN n'est pas installé.",
        })}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Améliorer les visages/)).toBeDisabled();
    expect(screen.getByText("GFPGAN n'est pas installé.")).toBeInTheDocument();
    expect(screen.getByText(/Indisponible/)).toBeInTheDocument();
  });
});

describe("SettingsPanel — modes de traitement", () => {
  it("propose l'IA et le redimensionnement classique comme choix distincts", () => {
    render(<SettingsPanel settings={REGLAGES} system={systeme()} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Agrandissement par IA/)).toBeChecked();
    expect(screen.getByLabelText(/Redimensionnement classique — sans IA/)).not.toBeChecked();
  });

  it("désactive le mode IA et affiche la raison quand le moteur manque", () => {
    render(
      <SettingsPanel
        settings={REGLAGES}
        system={systeme({
          ai_engine_available: false,
          ai_engine_unavailable_reason: "Les dépendances IA ne sont pas installées.",
        })}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Agrandissement par IA/)).toBeDisabled();
    expect(screen.getByText("Les dépendances IA ne sont pas installées.")).toBeInTheDocument();
  });

  it("avertit explicitement que le mode classique n'utilise pas d'IA", () => {
    render(
      <SettingsPanel
        settings={{ ...REGLAGES, mode: "classique" }}
        system={systeme()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/n'est PAS un agrandissement par IA/)).toBeInTheDocument();
  });

  it("retire l'amélioration des visages en passant au mode classique", () => {
    const onChange = vi.fn();
    render(
      <SettingsPanel
        settings={{ ...REGLAGES, face_enhance: true }}
        system={systeme()}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Redimensionnement classique — sans IA/));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "classique", face_enhance: false }),
    );
  });

  it("masque les réglages propres à l'IA en mode classique", () => {
    render(
      <SettingsPanel
        settings={{ ...REGLAGES, mode: "classique" }}
        system={systeme()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Améliorer les visages/)).not.toBeInTheDocument();
  });
});
