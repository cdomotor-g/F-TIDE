#!/usr/bin/env node
// Regenerates app.bundle.js from the ES modules so index.html (which loads the
// bundle, not the modules) always runs the same code as modules/.
// Usage: node scripts/build-bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORDER = [
  'modules/constants.js',
  'modules/state.js',
  'modules/utils.js',
  'modules/dom.js',
  'modules/validation.js',
  'modules/runner.js',
  'modules/tree-view.js',
  'modules/editor.js',
  'modules/stations.js',
  'modules/session-image.js',
  'modules/file-ops.js',
  'app.js'
];

function stripModuleSyntax(source) {
  return source
    // Remove import statements (may span multiple lines).
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];\s*$/gm, '')
    // Turn exported declarations into plain declarations.
    .replace(/^export\s+(function|var|let|const|async)/gm, '$1')
    // Drop bare export lists like: export { a, b };
    .replace(/^export\s*\{[^}]*\};\s*$/gm, '')
    // Collapse the blank lines the removals leave at the top.
    .replace(/^\s*\n/, '');
}

let out = "(function () {\n'use strict';\n\n";
for (const rel of ORDER) {
  const source = readFileSync(join(root, rel), 'utf8');
  out += '// ===== ' + rel + ' =====\n';
  out += stripModuleSyntax(source).trimEnd() + '\n\n';
}
out += '})();\n';

writeFileSync(join(root, 'app.bundle.js'), out);
console.log('app.bundle.js written (' + out.split('\n').length + ' lines)');
