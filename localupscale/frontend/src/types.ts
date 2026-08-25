// Types partagés avec l'API locale (voir backend/app/models/schemas.py).

export type Scale = 2 | 4;
export type ModelKind = "photo" | "anime";
export type OutputFormat = "png" | "jpg" | "webp";
export type JobStatus = "pending" | "running" | "done" | "error" | "cancelled";

/** Deux traitements distincts, jamais interchangeables :
 *  - "ia"        : agrandissement Real-ESRGAN (détails générés) ;
 *  - "classique" : redimensionnement Pillow, sans IA, choisi explicitement. */
export type ProcessingMode = "ia" | "classique";

export interface UpscaleSettings {
  mode: ProcessingMode;
  scale: Scale;
  model: ModelKind;
  face_enhance: boolean;
  output_format: OutputFormat;
  output_dir: string;
}

export interface ImageInfo {
  path: string;
  name: string;
  size_bytes: number;
  width: number;
  height: number;
  estimated_width: number;
  estimated_height: number;
  error: string | null;
}

export interface JobInfo {
  id: string;
  input_path: string;
  output_path: string | null;
  mode: ProcessingMode;
  status: JobStatus;
  progress: number;
  error: string | null;
}

export interface ErrorEntry {
  job_id: string;
  input_path: string;
  message: string;
}

export interface SystemInfo {
  ai_engine: string;
  ai_engine_available: boolean;
  ai_engine_unavailable_reason: string | null;
  device: "gpu" | "cpu";
  cpu_fallback: boolean;
  cpu_fallback_warning: string | null;
  face_enhance_available: boolean;
  face_enhance_unavailable_reason: string | null;
  classic_mode_label: string;
  classic_mode_warning: string;
  ai_disclaimer: string;
}

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  license: string;
  source_url: string;
  download_url: string;
  file_name: string;
  downloaded: boolean;
}
