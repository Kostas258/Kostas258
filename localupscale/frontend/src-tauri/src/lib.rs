//! Bibliothèque Tauri de LocalUpscale.
//!
//! Commandes exposées au frontend :
//! - `open_path` : ouvre un fichier ou un dossier avec l'application par défaut
//!   du système (écran résultat : « Ouvrir le fichier », « Ouvrir le dossier »).

/// Ouvre un chemin local (fichier ou dossier) avec l'application par défaut.
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| format!("Impossible d'ouvrir « {path} » : {e}"))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_path])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de LocalUpscale");
}
