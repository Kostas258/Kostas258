import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import { DropZone } from "./components/DropZone";
import { FileList } from "./components/FileList";
import { ModelsPanel } from "./components/ModelsPanel";
import { QueuePanel } from "./components/QueuePanel";
import { ResultView } from "./components/ResultView";
import { SettingsPanel } from "./components/SettingsPanel";
import { fr } from "./i18n/fr";
import type { ErrorEntry, ImageInfo, JobInfo, ModelInfo, SystemInfo, UpscaleSettings } from "./types";

const REGLAGES_DEFAUT: UpscaleSettings = {
  mode: "ia",
  scale: 2,
  model: "photo",
  face_enhance: false, // désactivé par défaut
  output_format: "png",
  output_dir: "",
};

export default function App() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [settings, setSettings] = useState<UpscaleSettings>(REGLAGES_DEFAUT);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [resultat, setResultat] = useState<JobInfo | null>(null);
  const [backendAbsent, setBackendAbsent] = useState(false);
  const [erreurLancement, setErreurLancement] = useState<string | null>(null);

  const chargerModeles = useCallback(() => {
    api.models().then(setModels).catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .system()
      .then((s) => {
        setSystem(s);
        setBackendAbsent(false);
      })
      .catch(() => setBackendAbsent(true));
    chargerModeles();
  }, [chargerModeles]);

  // Rafraîchissement de la file d'attente tant que des tâches sont actives.
  useEffect(() => {
    const actif = jobs.some((j) => j.status === "pending" || j.status === "running");
    if (!actif) return;
    const timer = setInterval(() => {
      api.listJobs().then(setJobs).catch(() => undefined);
      api.errors().then(setErrors).catch(() => undefined);
    }, 500);
    return () => clearInterval(timer);
  }, [jobs]);

  const ajouterFichiers = (paths: string[]) => {
    api
      .probe(paths, settings.scale)
      .then((infos) =>
        setImages((prev) => {
          const connus = new Set(prev.map((i) => i.path));
          return [...prev, ...infos.filter((i) => !connus.has(i.path))];
        }),
      )
      .catch(() => undefined);
  };

  // Réestime les résolutions quand le facteur change.
  useEffect(() => {
    setImages((prev) =>
      prev.map((img) =>
        img.error
          ? img
          : {
              ...img,
              estimated_width: img.width * settings.scale,
              estimated_height: img.height * settings.scale,
            },
      ),
    );
  }, [settings.scale]);

  // Le moteur IA est demandé mais indisponible : on bloque explicitement le
  // lancement plutôt que de basculer en douce vers un traitement sans IA.
  const iaBloquee = system !== null && !system.ai_engine_available && settings.mode === "ia";
  const aucuneImageValide = images.length === 0 || images.every((i) => Boolean(i.error));

  const lancer = () => {
    setErreurLancement(null);
    const valides = images.filter((i) => !i.error).map((i) => i.path);
    if (valides.length === 0 || !settings.output_dir) return;
    api
      .createJobs(valides, settings)
      .then((created) => setJobs((prev) => [...prev, ...created]))
      .catch((e: unknown) =>
        setErreurLancement(e instanceof Error ? e.message : String(e)),
      );
  };

  return (
    <main className="app">
      <header className="app__entete">
        <h1>{fr.app.titre}</h1>
        <p>{fr.app.sousTitre}</p>
        {system?.cpu_fallback_warning && (
          <p className="avertissement" role="alert">
            {system.cpu_fallback_warning}
          </p>
        )}
        {backendAbsent && (
          <p className="avertissement" role="alert">
            Le backend local ne répond pas. Lancez-le avec les scripts du dossier
            «&nbsp;scripts&nbsp;».
          </p>
        )}
      </header>

      <DropZone onFiles={ajouterFichiers} />
      <FileList
        images={images}
        onRemove={(path) => setImages((prev) => prev.filter((i) => i.path !== path))}
      />

      <SettingsPanel settings={settings} system={system} onChange={setSettings} />

      <button
        type="button"
        className="principal"
        disabled={aucuneImageValide || !settings.output_dir || iaBloquee}
        onClick={lancer}
      >
        {fr.traitement.lancer}
      </button>
      {iaBloquee && (
        <p className="avertissement" role="alert">
          {system?.ai_engine_unavailable_reason ?? fr.avertissements.iaIndisponible}
        </p>
      )}
      {erreurLancement && (
        <p className="avertissement" role="alert">
          {erreurLancement}
        </p>
      )}
      <p className="muet">{fr.avertissements.sourcesPreservees}</p>

      <QueuePanel
        jobs={jobs}
        errors={errors}
        onCancel={(id) => api.cancelJob(id).catch(() => undefined)}
        onCancelAll={() => api.cancelAll().catch(() => undefined)}
        onSelectResult={setResultat}
      />

      {resultat && <ResultView job={resultat} onClose={() => setResultat(null)} />}

      <ModelsPanel models={models} onModelsChanged={chargerModeles} />

      <footer className="app__pied">
        <p className="avertissement">{fr.avertissements.ia}</p>
      </footer>
    </main>
  );
}
