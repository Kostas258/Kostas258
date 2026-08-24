import { fr } from "../i18n/fr";
import type { JobInfo } from "../types";
import { CompareSlider } from "./CompareSlider";

interface Props {
  job: JobInfo;
  onClose: () => void;
}

/** Convertit un chemin local en URL exploitable par le webview Tauri. */
function toAssetUrl(path: string): string {
  const w = window as unknown as {
    __TAURI__?: { core: { convertFileSrc: (p: string) => string } };
  };
  return w.__TAURI__ ? w.__TAURI__.core.convertFileSrc(path) : `file://${path}`;
}

/** Ouvre un fichier ou un dossier avec l'application par défaut (via Tauri). */
async function openPath(path: string): Promise<void> {
  const w = window as unknown as {
    __TAURI__?: { core: { invoke: (cmd: string, args: object) => Promise<unknown> } };
  };
  if (w.__TAURI__) {
    await w.__TAURI__.core.invoke("open_path", { path });
  } else {
    // Mode navigateur (développement) : ouverture impossible, on l'indique.
    window.alert(`Ouverture disponible uniquement dans l'application de bureau : ${path}`);
  }
}

/** Écran résultat : ouverture du fichier / dossier et comparaison avant-après. */
export function ResultView({ job, onClose }: Props) {
  if (!job.output_path) return null;
  const outputDir = job.output_path.replace(/[\\/][^\\/]+$/, "");
  return (
    <section className="panneau" aria-label={fr.resultat.titre}>
      <header className="panneau__entete">
        <h2>{fr.resultat.titre}</h2>
        <button type="button" className="lien" onClick={onClose}>
          ✕
        </button>
      </header>
      <div className="resultat__actions">
        <button type="button" onClick={() => openPath(job.output_path!)}>
          {fr.resultat.ouvrirFichier}
        </button>
        <button type="button" onClick={() => openPath(outputDir)}>
          {fr.resultat.ouvrirDossier}
        </button>
      </div>
      <CompareSlider beforeSrc={toAssetUrl(job.input_path)} afterSrc={toAssetUrl(job.output_path)} />
      <p className="avertissement">{fr.avertissements.ia}</p>
    </section>
  );
}
