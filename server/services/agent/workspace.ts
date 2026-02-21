// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy string replacement
// Ported from OpenCode (MIT) -- https://github.com/sst/opencode
// OpenCode credits Cline and Gemini CLI as additional sources for these strategies.
// ─────────────────────────────────────────────────────────────────────────────

/** Compute the Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

type Replacer = (content: string, search: string, replace: string) => string | null;

/** Strategy 1: Exact string match. */
const SimpleReplacer: Replacer = (content, search, replace) => {
  const count = (content.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
  if (count === 0) return null;
  if (count > 1) throw new Error(`Found ${count} occurrences of the search block -- be more specific.`);
  return content.replace(search, replace);
};

/** Strategy 2: Trim each line before comparing. */
const LineTrimmedReplacer: Replacer = (content, search, replace) => {
  const trimLines = (s: string) => s.split('\n').map((l) => l.trim()).join('\n');
  const trimmedContent = trimLines(content);
  const trimmedSearch = trimLines(search);
  if (!trimmedContent.includes(trimmedSearch)) return null;
  return content.replace(
    new RegExp(search.split('\n').map((l) => `[ \\t]*${l.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*`).join('\\n')),
    replace
  );
};

/** Strategy 3: Match by first/last line anchors with Levenshtein similarity on middle lines. */
const BlockAnchorReplacer: Replacer = (content, search, _replace) => {
  const searchLines = search.split('\n');
  if (searchLines.length < 3) return null;

  const firstLine = searchLines[0].trim();
  const lastLine = searchLines[searchLines.length - 1].trim();
  const contentLines = content.split('\n');

  for (let i = 0; i < contentLines.length; i++) {
    if (contentLines[i].trim() !== firstLine) continue;
    for (let j = i + 1; j < contentLines.length; j++) {
      if (contentLines[j].trim() !== lastLine) continue;

      const middleContent = contentLines.slice(i + 1, j).join('\n');
      const middleSearch = searchLines.slice(1, -1).join('\n');
      if (similarity(middleContent, middleSearch) >= 0.5) {
        return content;
      }
    }
  }
  return null;
};

/** Strategy 4: Collapse all whitespace before comparing. */
const WhitespaceNormalizedReplacer: Replacer = (content, search, replace) => {
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  if (!normalize(content).includes(normalize(search))) return null;

  const searchPattern = search
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const regex = new RegExp(searchPattern);
  if (!regex.test(content)) return null;
  return content.replace(regex, replace);
};

/** Strategy 5: Strip common indentation prefix before comparing. */
const IndentationFlexibleReplacer: Replacer = (content, search, replace) => {
  const stripCommonIndent = (s: string) => {
    const lines = s.split('\n').filter((l) => l.trim().length > 0);
    const minIndent = Math.min(...lines.map((l) => l.match(/^(\s*)/)?.[1].length ?? 0));
    return s
      .split('\n')
      .map((l) => l.slice(minIndent))
      .join('\n');
  };
  const strippedContent = stripCommonIndent(content);
  const strippedSearch = stripCommonIndent(search);
  if (!strippedContent.includes(strippedSearch)) return null;

  const searchLines = search.split('\n');
  const indentMatch = searchLines.find((l) => l.trim().length > 0)?.match(/^(\s*)/);
  const indent = indentMatch?.[1] ?? '';
  const reindentedReplace = replace
    .split('\n')
    .map((l, i) => (i === 0 ? l : indent + l))
    .join('\n');
  return content.replace(strippedSearch, reindentedReplace);
};

/** Strategy 6: Handle escaped characters (\n, \t, etc.) */
const EscapeNormalizedReplacer: Replacer = (content, search, replace) => {
  const unescaped = search.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
  if (unescaped === search) return null;
  if (!content.includes(unescaped)) return null;
  return content.replace(unescaped, replace);
};

/** Strategy 7: Trim the entire search block boundary. */
const TrimmedBoundaryReplacer: Replacer = (content, search, replace) => {
  const trimmed = search.trim();
  if (!content.includes(trimmed)) return null;
  return content.replace(trimmed, replace);
};

/** Strategy 8: 50% line similarity threshold (context-aware). */
const ContextAwareReplacer: Replacer = (content, search, replace) => {
  const searchLines = search.split('\n');
  const contentLines = content.split('\n');

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    const candidate = contentLines.slice(i, i + searchLines.length).join('\n');
    if (similarity(candidate, search) >= 0.5) {
      return content.slice(0, content.indexOf(candidate)) + replace + content.slice(content.indexOf(candidate) + candidate.length);
    }
  }
  return null;
};

/** Strategy 9: Replace all exact occurrences (for replaceAll scenarios). */
const MultiOccurrenceReplacer: Replacer = (content, search, replace) => {
  if (!content.includes(search)) return null;
  return content.split(search).join(replace);
};

const REPLACERS: Replacer[] = [
  SimpleReplacer,
  LineTrimmedReplacer,
  WhitespaceNormalizedReplacer,
  IndentationFlexibleReplacer,
  EscapeNormalizedReplacer,
  TrimmedBoundaryReplacer,
  ContextAwareReplacer,
  MultiOccurrenceReplacer,
  BlockAnchorReplacer,
];

/**
 * Attempt to replace `search` with `replace` in `content` using a cascade
 * of nine progressively fuzzier strategies. Returns the updated string, or
 * throws if no strategy succeeds.
 */
function fuzzyReplace(content: string, search: string, replace: string): string {
  for (const replacer of REPLACERS) {
    try {
      const result = replacer(content, search, replace);
      if (result !== null && result !== content) return result;
    } catch (err) {
      throw err;
    }
  }
  throw new Error('Could not find the search block in the file. Check that the oldString exactly matches the file content.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Virtual workspace
// ─────────────────────────────────────────────────────────────────────────────

export interface VirtualFile {
  path: string;
  content: string;
}

export interface ValidationResult {
  valid: boolean;
  missingFiles: string[];
  warnings: string[];
}

export class VirtualWorkspace {
  private files: Map<string, VirtualFile> = new Map();

  private normalize(path: string): string {
    return path.replace(/^[\/\\]+/, '').trim();
  }

  writeFile(path: string, content: string): void {
    const normalizedPath = this.normalize(path);
    this.files.set(normalizedPath, { path: normalizedPath, content });
  }

  readFile(path: string): string | undefined {
    return this.files.get(this.normalize(path))?.content;
  }

  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Replace a specific block of text in an existing file using multi-strategy
   * fuzzy matching. Returns true on success, throws on unrecoverable error.
   */
  patchFile(path: string, searchBlock: string, replaceBlock: string): boolean {
    const file = this.readFile(path);
    if (!file) return false;

    const newContent = fuzzyReplace(file, searchBlock, replaceBlock);
    this.writeFile(path, newContent);
    return true;
  }

  clear(): void {
    this.files.clear();
  }

  /**
   * Validate workspace completeness against a list of planned file paths.
   * Checks for index.html, planned file coverage, and minimal HTML structure.
   */
  validateWorkspace(plannedPaths: string[]): ValidationResult {
    const written = new Set(this.listFiles());
    const missingFiles: string[] = [];
    const warnings: string[] = [];

    for (const p of plannedPaths) {
      if (!written.has(this.normalize(p))) {
        missingFiles.push(p);
      }
    }

    const htmlContent = this.readFile('index.html');
    if (!htmlContent) {
      warnings.push('index.html was not written.');
    } else {
      if (!htmlContent.includes('<html')) warnings.push('index.html is missing <html> tag.');
      if (!htmlContent.includes('<head')) warnings.push('index.html is missing <head> tag.');
      if (!htmlContent.includes('<body')) warnings.push('index.html is missing <body> tag.');
    }

    return {
      valid: missingFiles.length === 0,
      missingFiles,
      warnings,
    };
  }

  /**
   * Bundle the workspace into a single HTML string suitable for an iframe srcdoc.
   * Injects CSS and JS from sibling files into index.html if present.
   */
  bundleToHtml(): string {
    const htmlFile =
      this.readFile('index.html') ||
      this.readFile('index.tsx') ||
      this.readFile('App.tsx');

    if (!htmlFile) {
      return Array.from(this.files.values())
        .map((f) => `<!-- ${f.path} -->\n${f.content}`)
        .join('\n\n');
    }

    let bundled = htmlFile;

    const styles = this.listFiles().filter((f) => f.endsWith('.css'));
    let cssBlock = '';
    for (const style of styles) {
      cssBlock += `/* ${style} */\n${this.readFile(style)}\n`;
    }
    if (cssBlock) {
      bundled = bundled.includes('</head>')
        ? bundled.replace('</head>', `<style>\n${cssBlock}</style>\n</head>`)
        : `<style>\n${cssBlock}</style>\n` + bundled;
    }

    const scripts = this.listFiles().filter(
      (f) => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx')
    );
    let jsBlock = '';
    for (const script of scripts) {
      jsBlock += `/* ${script} */\n${this.readFile(script)}\n`;
    }
    if (jsBlock) {
      bundled = bundled.includes('</body>')
        ? bundled.replace('</body>', `<script>\n${jsBlock}</script>\n</body>`)
        : bundled + `\n<script>\n${jsBlock}</script>`;
    }

    return bundled;
  }
}
