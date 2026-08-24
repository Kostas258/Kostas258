import { useState } from "react";
import { fr } from "../i18n/fr";
import { clampSliderPercent } from "../lib/format";

interface Props {
  beforeSrc: string;
  afterSrc: string;
}

/** Comparateur avant / après avec curseur. */
export function CompareSlider({ beforeSrc, afterSrc }: Props) {
  const [percent, setPercent] = useState(50);

  return (
    <div className="comparateur">
      <div className="comparateur__cadre">
        <img src={afterSrc} alt={fr.resultat.apres} className="comparateur__image" />
        <div
          className="comparateur__avant"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        >
          <img src={beforeSrc} alt={fr.resultat.avant} className="comparateur__image" />
        </div>
        <div className="comparateur__barre" style={{ left: `${percent}%` }} aria-hidden="true" />
        <span className="comparateur__etiquette comparateur__etiquette--gauche">
          {fr.resultat.avant}
        </span>
        <span className="comparateur__etiquette comparateur__etiquette--droite">
          {fr.resultat.apres}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        aria-label={fr.resultat.curseurAide}
        onChange={(e) => setPercent(clampSliderPercent(Number(e.target.value)))}
      />
      <p className="muet">{fr.resultat.curseurAide}</p>
    </div>
  );
}
