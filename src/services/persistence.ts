import { type DesignSpec, DesignSpecSchema } from '../types/spec';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { z } from 'zod';

const SPECS_KEY = STORAGE_KEYS.SPECS;

const AllSpecsSchema = z.record(z.string(), DesignSpecSchema);

export function saveSpec(spec: DesignSpec): void {
  const specs = getAllSpecs();
  specs[spec.id] = spec;
  localStorage.setItem(SPECS_KEY, JSON.stringify(specs));
}

export function loadSpec(specId: string): DesignSpec | null {
  const specs = getAllSpecs();
  return specs[specId] ?? null;
}

function getAllSpecs(): Record<string, DesignSpec> {
  const raw = localStorage.getItem(SPECS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result = AllSpecsSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('Invalid specs found in local storage', result.error);
      return {};
    }
    return result.data;
  } catch {
    return {};
  }
}

export function deleteSpec(specId: string): void {
  const specs = getAllSpecs();
  delete specs[specId];
  localStorage.setItem(SPECS_KEY, JSON.stringify(specs));
}

export function getSpecList(): Array<{ id: string; title: string; lastModified: string }> {
  const specs = getAllSpecs();
  return Object.values(specs)
    .map((s) => ({ id: s.id, title: s.title, lastModified: s.lastModified }))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

export function exportSpec(spec: DesignSpec): void {
  const blob = new Blob([JSON.stringify(spec, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.title.replace(/\s+/g, '-').toLowerCase()}-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSpec(file: File): Promise<DesignSpec> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error('Invalid spec file: could not parse JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid spec file: could not parse JSON');
  }

  const result = DesignSpecSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Invalid spec file: missing required fields');
  }
  return result.data;
}

