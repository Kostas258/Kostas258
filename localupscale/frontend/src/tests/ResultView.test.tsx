import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultView } from "../components/ResultView";
import type { JobInfo } from "../types";

function tache(overrides: Partial<JobInfo> = {}): JobInfo {
  return {
    id: "abc123",
    input_path: "/images/chat.png",
    output_path: "/sorties/chat_upscaled_x2.png",
    mode: "ia",
    status: "done",
    progress: 1,
    error: null,
    ...overrides,
  };
}

describe("ResultView — honnêteté du libellé", () => {
  it("annonce un résultat IA pour une tâche IA", () => {
    render(<ResultView job={tache()} onClose={vi.fn()} />);
    expect(screen.getByText(/Agrandissement par IA \(Real-ESRGAN\)/)).toBeInTheDocument();
  });

  it("ne présente jamais une sortie classique comme un résultat Real-ESRGAN", () => {
    render(
      <ResultView
        job={tache({ mode: "classique", output_path: "/sorties/chat_redim_x2.png" })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/n'est pas un résultat Real-ESRGAN/)).toBeInTheDocument();
    expect(screen.queryByText(/Agrandissement par IA \(Real-ESRGAN\)/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Les détails ajoutés par l'IA sont générés/),
    ).not.toBeInTheDocument();
  });

  it("affiche les actions d'ouverture", () => {
    render(<ResultView job={tache()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Ouvrir le fichier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir le dossier de sortie" })).toBeInTheDocument();
  });
});
