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

export function getAllSpecs(): Record<string, DesignSpec> {
  const raw = localStorage.getItem(SPECS_KEY);
  return raw ? JSON.parse(raw) : {};
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

export function getStorageUsage(): { used: number; limit: number; percentage: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += localStorage.getItem(key)?.length ?? 0;
    }
  }
  // localStorage limit is typically ~5MB (chars are ~2 bytes each)
  const limit = 5 * 1024 * 1024;
  return { used, limit, percentage: (used / limit) * 100 };
}
