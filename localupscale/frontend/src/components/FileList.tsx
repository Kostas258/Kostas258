import { fr } from "../i18n/fr";
import { formatBytes } from "../lib/format";
import type { ImageInfo } from "../types";

interface Props {
  images: ImageInfo[];
  onRemove: (path: string) => void;
}

/** Liste des images importées : nom, poids, résolutions d'origine et estimée. */
export function FileList({ images, onRemove }: Props) {
  if (images.length === 0) {
    return <p className="muet">{fr.fichiers.vide}</p>;
  }
  return (
    <table className="fichiers">
      <thead>
        <tr>
          <th>{fr.fichiers.nom}</th>
          <th>{fr.fichiers.poids}</th>
          <th>{fr.fichiers.resolutionOrigine}</th>
          <th>{fr.fichiers.resolutionEstimee}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {images.map((img) => (
          <tr key={img.path} className={img.error ? "fichiers__erreur" : undefined}>
            <td title={img.path}>{img.name}</td>
            <td>{formatBytes(img.size_bytes)}</td>
            <td>{img.error ? img.error : `${img.width} × ${img.height} px`}</td>
            <td>{img.error ? "—" : `${img.estimated_width} × ${img.estimated_height} px`}</td>
            <td>
              <button type="button" className="lien" onClick={() => onRemove(img.path)}>
                {fr.fichiers.retirer}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
