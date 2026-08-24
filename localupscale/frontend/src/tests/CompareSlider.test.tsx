import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompareSlider } from "../components/CompareSlider";

describe("CompareSlider", () => {
  it("affiche les images avant et après avec des libellés français", () => {
    render(<CompareSlider beforeSrc="avant.png" afterSrc="apres.png" />);
    expect(screen.getByAltText("Avant")).toHaveAttribute("src", "avant.png");
    expect(screen.getByAltText("Après")).toHaveAttribute("src", "apres.png");
  });

  it("déplace la ligne de séparation avec le curseur", () => {
    const { container } = render(<CompareSlider beforeSrc="avant.png" afterSrc="apres.png" />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "25" } });
    const barre = container.querySelector<HTMLElement>(".comparateur__barre");
    expect(barre?.style.left).toBe("25%");
  });
});

describe("CompareSlider — accessibilité", () => {
  it("le curseur porte une consigne en français", () => {
    render(<CompareSlider beforeSrc="a.png" afterSrc="b.png" />);
    expect(
      screen.getByLabelText("Déplacez le curseur pour comparer avant / après."),
    ).toBeInTheDocument();
  });
});
