import { useRef, useState } from "react";
import { fr } from "../i18n/fr";
import { isSupportedFile } from "../lib/format";

interface Props {
  onFiles: (paths: string[]) => void;
}

/** Zone de glisser-déposer + sélecteur de fichiers.
 *
 * Sous Tauri, les fichiers déposés exposent leur chemin absolu ; en mode
 * navigateur (développement), seul le nom est disponible.
 */
export function DropZone({ onFiles }: Props) {
  const [survol, setSurvol] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileList = (list: FileList | null) => {
    if (!list) return;
    const paths = Array.from(list)
      .filter((f) => isSupportedFile(f.name))
      // @ts-expect-error : `path` est fourni par le webview Tauri.
      .map((f) => (f.path as string | undefined) ?? f.name);
    if (paths.length > 0) onFiles(paths);
  };

  return (
    <div
      className={`dropzone${survol ? " dropzone--survol" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={fr.import.deposer}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        handleFileList(e.dataTransfer.files);
      }}
    >
      <p className="dropzone__titre">{fr.import.deposer}</p>
      <p>
        {fr.import.ou}{" "}
        <button type="button" className="lien">
          {fr.import.parcourir}
        </button>
      </p>
      <p className="dropzone__formats">{fr.import.formats}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp"
        hidden
        onChange={(e) => handleFileList(e.target.files)}
      />
    </div>
  );
}
