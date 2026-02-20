export interface VirtualFile {
  path: string;
  content: string;
}

export class VirtualWorkspace {
  private files: Map<string, VirtualFile> = new Map();

  writeFile(path: string, content: string): void {
    // Normalize path to prevent directory traversal or leading slashes
    const normalizedPath = path.replace(/^[\/\\]+/, '').trim();
    this.files.set(normalizedPath, { path: normalizedPath, content });
  }

  readFile(path: string): string | undefined {
    const normalizedPath = path.replace(/^[\/\\]+/, '').trim();
    return this.files.get(normalizedPath)?.content;
  }

  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Replace a specific block of text in an existing file.
   * Useful for the LLM to patch files without rewriting the entire content,
   * saving output tokens on large files.
   */
  patchFile(path: string, searchBlock: string, replaceBlock: string): boolean {
    const file = this.readFile(path);
    if (!file) return false;

    // Aider-style unified diff or simple strict string replacement
    // For now, strict string replacement
    if (!file.includes(searchBlock)) {
      return false; // Search block not found
    }

    const newContent = file.replace(searchBlock, replaceBlock);
    this.writeFile(path, newContent);
    return true;
  }

  /**
   * Clear the workspace.
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Bundle the workspace into a single HTML string suitable for an iframe srcdoc.
   * Looks for an index.html and attempts to inject CSS/JS if present.
   */
  bundleToHtml(): string {
    const htmlFile = this.readFile('index.html') || this.readFile('index.tsx') || this.readFile('App.tsx');
    if (!htmlFile) {
      // Fallback: Just return a concatenation if no main entry point is found
      return Array.from(this.files.values()).map(f => `<!-- ${f.path} -->\n${f.content}`).join('\n\n');
    }

    let bundled = htmlFile;

    // Inject CSS
    const styles = this.listFiles().filter(f => f.endsWith('.css'));
    let cssBlock = '';
    for (const style of styles) {
      cssBlock += `/* ${style} */\n${this.readFile(style)}\n`;
    }
    
    if (cssBlock) {
      if (bundled.includes('</head>')) {
        bundled = bundled.replace('</head>', `<style>\n${cssBlock}</style>\n</head>`);
      } else {
        bundled = `<style>\n${cssBlock}</style>\n` + bundled;
      }
    }

    // Inject JS
    const scripts = this.listFiles().filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx'));
    let jsBlock = '';
    for (const script of scripts) {
      jsBlock += `/* ${script} */\n${this.readFile(script)}\n`;
    }

    if (jsBlock) {
      if (bundled.includes('</body>')) {
        bundled = bundled.replace('</body>', `<script>\n${jsBlock}</script>\n</body>`);
      } else {
        bundled += `\n<script>\n${jsBlock}</script>`;
      }
    }

    return bundled;
  }
}
