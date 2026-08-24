import { useState } from "react";
import { api } from "../api/client";
import { fr } from "../i18n/fr";
import type { ModelInfo } from "../types";

interface Props {
  models: ModelInfo[];
  onModelsChanged: () => void;
}

/** Gestion des modèles : licence et source affichées, consentement explicite
 * requis avant tout téléchargement. */
export function ModelsPanel({ models, onModelsChanged }: Props) {
  const [enAttente, setEnAttente] = useState<ModelInfo | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const confirmer = async () => {
    if (!enAttente) return;
    setChargement(true);
    setErreur(null);
    try {
      await api.downloadModel(enAttente.id, true);
      setEnAttente(null);
      onModelsChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  };

  return (
    <section className="panneau" aria-label={fr.modeles.titre}>
      <h2>{fr.modeles.titre}</h2>
      <ul className="modeles">
        {models.map((m) => (
          <li key={m.id}>
            <strong>{m.label}</strong> — {m.description}
            <br />
            {fr.modeles.licence} : {m.license} · {fr.modeles.source} :{" "}
            <a href={m.source_url} target="_blank" rel="noreferrer">
              {m.source_url}
            </a>
            <br />
            {m.downloaded ? (
              <em>{fr.modeles.installe}</em>
            ) : (
              <button type="button" onClick={() => setEnAttente(m)}>
                {fr.modeles.telecharger}
              </button>
            )}
          </li>
        ))}
      </ul>

      {enAttente && (
        <div className="dialogue" role="dialog" aria-modal="true">
          <div className="dialogue__contenu">
            <h3>{enAttente.label}</h3>
            <p>
              {fr.modeles.licence} : <strong>{enAttente.license}</strong>
              <br />
              {fr.modeles.source} : {enAttente.source_url}
            </p>
            <p>{fr.modeles.consentement}</p>
            {erreur && <p className="avertissement">{erreur}</p>}
            <button type="button" disabled={chargement} onClick={confirmer}>
              {fr.modeles.accepter}
            </button>{" "}
            <button type="button" className="lien" onClick={() => setEnAttente(null)}>
              {fr.modeles.refuser}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
