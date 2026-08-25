import { fr } from "../i18n/fr";
import type { OutputFormat, ProcessingMode, Scale, SystemInfo, UpscaleSettings } from "../types";

interface Props {
  settings: UpscaleSettings;
  system: SystemInfo | null;
  onChange: (settings: UpscaleSettings) => void;
}

/** Réglages : mode de traitement, facteur x2/x4, modèle, visages, format
 *  et dossier de sortie.
 *
 *  Le mode IA et le redimensionnement classique sont deux choix explicites :
 *  l'application ne bascule jamais de l'un à l'autre sans l'utilisateur.
 */
export function SettingsPanel({ settings, system, onChange }: Props) {
  const set = <K extends keyof UpscaleSettings>(key: K, value: UpscaleSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const modeIa = settings.mode === "ia";
  const iaIndisponible = system !== null && !system.ai_engine_available;
  const visagesIndisponibles = system !== null && !system.face_enhance_available;
  const raisonVisages = system?.face_enhance_unavailable_reason ?? undefined;

  const changerMode = (mode: ProcessingMode) => {
    // L'amélioration des visages n'existe que dans le parcours IA.
    onChange({ ...settings, mode, face_enhance: mode === "ia" ? settings.face_enhance : false });
  };

  return (
    <section className="panneau" aria-label={fr.reglages.titre}>
      <h2>{fr.reglages.titre}</h2>

      <fieldset className="colonne">
        <legend>{fr.reglages.traitement}</legend>
        <label>
          <input
            type="radio"
            name="mode"
            checked={modeIa}
            disabled={iaIndisponible}
            onChange={() => changerMode("ia")}
          />
          {fr.reglages.modeIa}
        </label>
        <p className="muet indent">{fr.reglages.modeIaAide}</p>
        {iaIndisponible && (
          <p className="avertissement" role="alert">
            {system?.ai_engine_unavailable_reason ?? fr.avertissements.iaIndisponible}
          </p>
        )}
        <label>
          <input
            type="radio"
            name="mode"
            checked={!modeIa}
            onChange={() => changerMode("classique")}
          />
          {fr.reglages.modeClassique}
        </label>
        <p className="muet indent">{fr.reglages.modeClassiqueAide}</p>
        {!modeIa && system && (
          <p className="avertissement" role="alert">
            {system.classic_mode_warning}
          </p>
        )}
      </fieldset>

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

      {modeIa && (
        <>
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

          <label className="case" title={raisonVisages ?? fr.reglages.visagesAide}>
            <input
              type="checkbox"
              checked={settings.face_enhance}
              disabled={visagesIndisponibles}
              onChange={(e) => set("face_enhance", e.target.checked)}
            />
            {fr.reglages.visages}
            {visagesIndisponibles && <em> — {fr.reglages.visagesIndisponible}</em>}
          </label>
          {visagesIndisponibles && raisonVisages && <p className="muet indent">{raisonVisages}</p>}
        </>
      )}

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
