import { type DesignSpec, DesignSpecSchema } from '../types/spec';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { z } from 'zod';

const CANVASES_KEY = STORAGE_KEYS.CANVASES;

const AllCanvasesSchema = z.record(z.string(), DesignSpecSchema);

export function saveCanvas(spec: DesignSpec): void {
  const canvases = getAllCanvases();
  canvases[spec.id] = spec;
  localStorage.setItem(CANVASES_KEY, JSON.stringify(canvases));
}

export function loadCanvas(specId: string): DesignSpec | null {
  const canvases = getAllCanvases();
  return canvases[specId] ?? null;
}

function getAllCanvases(): Record<string, DesignSpec> {
  const raw = localStorage.getItem(CANVASES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result = AllCanvasesSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('Invalid canvases found in local storage', result.error);
      return {};
    }
    return result.data;
  } catch {
    return {};
  }
}

export function deleteCanvas(specId: string): void {
  const canvases = getAllCanvases();
  delete canvases[specId];
  localStorage.setItem(CANVASES_KEY, JSON.stringify(canvases));
}

export function getCanvasList(): Array<{ id: string; title: string; lastModified: string }> {
  const canvases = getAllCanvases();
  return Object.values(canvases)
    .map((s) => ({ id: s.id, title: s.title, lastModified: s.lastModified }))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

export function exportCanvas(spec: DesignSpec): void {
  const blob = new Blob([JSON.stringify(spec, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.title.replace(/\s+/g, '-').toLowerCase()}-canvas.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importCanvas(file: File): Promise<DesignSpec> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error('Invalid canvas file: could not parse JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid canvas file: could not parse JSON');
  }

  const result = DesignSpecSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Invalid canvas file: missing required fields');
  }
  return result.data;
}

