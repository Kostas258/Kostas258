import { fr } from "../i18n/fr";
import type { ErrorEntry, JobInfo, JobStatus } from "../types";

const LIBELLES: Record<JobStatus, string> = {
  pending: fr.traitement.enAttente,
  running: fr.traitement.enCours,
  done: fr.traitement.termine,
  error: fr.traitement.erreur,
  cancelled: fr.traitement.annulee,
};

interface Props {
  jobs: JobInfo[];
  errors: ErrorEntry[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  onSelectResult: (job: JobInfo) => void;
}

/** File d'attente : progression par image, annulation, journal d'erreurs.
 *  Chaque tâche affiche le mode réellement employé (IA ou sans IA). */
export function QueuePanel({ jobs, errors, onCancel, onCancelAll, onSelectResult }: Props) {
  const actifs = jobs.some((j) => j.status === "pending" || j.status === "running");
  return (
    <section className="panneau" aria-label={fr.traitement.fileAttente}>
      <header className="panneau__entete">
        <h2>{fr.traitement.fileAttente}</h2>
        {actifs && (
          <button type="button" onClick={onCancelAll}>
            {fr.traitement.annulerTout}
          </button>
        )}
      </header>

      <ul className="file">
        {jobs.map((job) => (
          <li key={job.id} className={`file__item file__item--${job.status}`}>
            <span className="file__nom" title={job.input_path}>
              {job.input_path.split(/[\\/]/).pop()}
            </span>
            <span className={`badge badge--${job.mode}`}>
              {job.mode === "ia" ? fr.traitement.badgeIa : fr.traitement.badgeClassique}
            </span>
            <progress max={1} value={job.progress} aria-label={LIBELLES[job.status]} />
            <span>{LIBELLES[job.status]}</span>
            {(job.status === "pending" || job.status === "running") && (
              <button type="button" className="lien" onClick={() => onCancel(job.id)}>
                {fr.traitement.annuler}
              </button>
            )}
            {job.status === "done" && (
              <button type="button" className="lien" onClick={() => onSelectResult(job)}>
                {fr.resultat.titre}
              </button>
            )}
          </li>
        ))}
      </ul>

      <h3>{fr.traitement.journalErreurs}</h3>
      {errors.length === 0 ? (
        <p className="muet">{fr.traitement.aucuneErreur}</p>
      ) : (
        <ul className="erreurs" role="log">
          {errors.map((err, i) => (
            <li key={`${err.job_id}-${i}`}>
              <strong>{err.input_path.split(/[\\/]/).pop()}</strong> — {err.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
