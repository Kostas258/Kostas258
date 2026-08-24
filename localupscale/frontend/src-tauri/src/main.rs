// LocalUpscale — coque de bureau Tauri.
// Aucune fonctionnalité réseau : la fenêtre charge le frontend local et
// communique avec le backend FastAPI sur 127.0.0.1 uniquement.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    localupscale_lib::run()
}
