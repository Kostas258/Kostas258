// Types partagés avec l'API locale (voir backend/app/models/schemas.py).

export type Scale = 2 | 4;
export type ModelKind = "photo" | "anime";
export type OutputFormat = "png" | "jpg" | "webp";
export type JobStatus = "pending" | "running" | "done" | "error" | "cancelled";

export interface UpscaleSettings {
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
  engine: string;
  engine_available: boolean;
  device: "gpu" | "cpu";
  cpu_fallback: boolean;
  cpu_fallback_warning: string | null;
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
