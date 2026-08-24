import { fr } from "../i18n/fr";
import type { OutputFormat, Scale, UpscaleSettings } from "../types";

interface Props {
  settings: UpscaleSettings;
  onChange: (settings: UpscaleSettings) => void;
}

/** Réglages : facteur x2/x4, modèle, visages, format et dossier de sortie. */
export function SettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof UpscaleSettings>(key: K, value: UpscaleSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <section className="panneau" aria-label={fr.reglages.titre}>
      <h2>{fr.reglages.titre}</h2>

      <fieldset>
        <legend>{fr.reglages.facteur}</legend>
        {([2, 4] as Scale[]).map((s) => (
          <label key={s}>
            <input
              type="radio"
              name="scale"
              checked={settings.scale === s}
              onChange={() => set("scale", s)}
            />
            ×{s}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>{fr.reglages.modele}</legend>
        <label>
          <input
            type="radio"
            name="model"
            checked={settings.model === "photo"}
            onChange={() => set("model", "photo")}
          />
          {fr.reglages.modelePhoto}
        </label>
        <label>
          <input
            type="radio"
            name="model"
            checked={settings.model === "anime"}
            onChange={() => set("model", "anime")}
          />
          {fr.reglages.modeleAnime}
        </label>
      </fieldset>

      <label className="case" title={fr.reglages.visagesAide}>
        <input
          type="checkbox"
          checked={settings.face_enhance}
          onChange={(e) => set("face_enhance", e.target.checked)}
        />
        {fr.reglages.visages}
      </label>

      <label>
        {fr.reglages.formatSortie}
        <select
          value={settings.output_format}
          onChange={(e) => set("output_format", e.target.value as OutputFormat)}
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
        </select>
      </label>

      <label>
        {fr.reglages.dossierDestination}
        <input
          type="text"
          value={settings.output_dir}
          placeholder="/chemin/vers/le/dossier"
          onChange={(e) => set("output_dir", e.target.value)}
        />
      </label>
    </section>
  );
}
