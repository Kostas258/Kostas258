// Client de l'API locale. Toutes les requêtes restent sur 127.0.0.1 :
// aucune image, aucune donnée ne quitte la machine.

import type {
  ErrorEntry,
  ImageInfo,
  JobInfo,
  ModelInfo,
  Scale,
  SystemInfo,
  UpscaleSettings,
} from "../types";

const BASE = "http://127.0.0.1:8756/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erreur du backend local (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  system: () => request<SystemInfo>("/system"),
  models: () => request<ModelInfo[]>("/models"),
  downloadModel: (id: string, acceptLicense: boolean) =>
    request<ModelInfo>(`/models/${id}/download`, {
      method: "POST",
      body: JSON.stringify({ accept_license: acceptLicense }),
    }),
  probe: (paths: string[], scale: Scale) =>
    request<ImageInfo[]>("/images/probe", {
      method: "POST",
      body: JSON.stringify({ paths, scale }),
    }),
  createJobs: (paths: string[], settings: UpscaleSettings) =>
    request<JobInfo[]>("/jobs", {
      method: "POST",
      body: JSON.stringify({ paths, settings }),
    }),
  listJobs: () => request<JobInfo[]>("/jobs"),
  cancelJob: (id: string) => request<{ cancelled: boolean }>(`/jobs/${id}/cancel`, { method: "POST" }),
  cancelAll: () => request<{ cancelled: number }>("/jobs/cancel-all", { method: "POST" }),
  errors: () => request<ErrorEntry[]>("/errors"),
};
