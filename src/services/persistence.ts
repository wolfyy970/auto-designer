import type { DesignSpec } from '../types/spec';

const SPECS_KEY = 'auto-designer-specs';

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
    return JSON.parse(raw);
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

export function importSpec(file: File): Promise<DesignSpec> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const spec = JSON.parse(reader.result as string) as DesignSpec;
        if (!spec.id || !spec.title || !spec.sections) {
          reject(new Error('Invalid spec file: missing required fields'));
          return;
        }
        resolve(spec);
      } catch {
        reject(new Error('Invalid spec file: could not parse JSON'));
      }
    };
    reader.readAsText(file);
  });
}

