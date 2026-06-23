# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open `index.html` directly in a browser (or serve it with any static file server):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, no linter config, and no package.json. The codebase is plain vanilla JS ES modules with no transpilation.

## Architecture

FWIN-ONSM-Matrix is a single-page browser app for running structured infrastructure evaluations using a decision tree loaded from `tree.json`.

**Entry point:** `index.html` loads `report.js` as a regular script (which sets the `REPORT_CSS` global used when building HTML reports), then loads `app.js` as an ES module. `app.js` wires up all event listeners and initialises the UI.

**Modules (`/modules/`):**

| File | Responsibility |
|---|---|
| `state.js` | Single exported `state` object — all mutable runtime state lives here |
| `dom.js` | Cached DOM element references exported as `els` — import this instead of querying the DOM |
| `constants.js` | Storage keys and the icon emoji palette |
| `runner.js` | Session flow: `renderNode`, `selectOption`, `renderResult`, `restart`, `goBack`, missing-rule handling |
| `file-ops.js` | Load `tree.json`, save/download updated tree + changelog, fork branches, export HTML reports, persist sessions to `localStorage` |
| `editor.js` | In-browser node/result editor — guided form and raw JSON tab, create/delete/rename payloads |
| `tree-view.js` | Cytoscape.js visual tree map (loaded from CDN in `index.html`), mini-tree sidebar, tables view |
| `validation.js` | Tree structure validation — called on load and before applying edits |
| `utils.js` | Pure helpers: `clone`, `escapeHtml`, `escapeAttr`, `slugify`, `downloadFile`, etc. |

**Circular imports:** `runner.js`, `editor.js`, `tree-view.js`, and `file-ops.js` import from each other. This is intentional and resolved via ES module live bindings — functions are only called at runtime after all modules have evaluated.

## tree.json format

The decision tree is a JSON file. Key fields:

```json
{
  "title": "...",
  "version": "v1.0",
  "versionHash": "sha256:...",
  "parentVersionHash": null,
  "branchId": "main",
  "startNode": "NODE_ID",
  "nodes": {
    "NODE_ID": {
      "id": "NODE_ID",
      "question": "...",
      "icon": "🌊",
      "x": 100,
      "y": 200,
      "options": [{ "label": "Yes", "next": "ANOTHER_NODE_OR_RESULT_ID" }],
      "links": [{ "label": "Reference doc", "url": "https://..." }]
    }
  },
  "results": {
    "RESULT_ID": {
      "id": "RESULT_ID",
      "title": "...",
      "rationale": "...",
      "x": 300,
      "y": 400
    }
  }
}
```

`option.next` is a plain string ID pointing to either a node or result. `x`/`y` on nodes and results are Cytoscape.js canvas positions written back when you drag items in the tree map. They are excluded from the SHA-256 content hash so layout changes don't increment the version. `tree_schema.json` reflects all of this accurately.

**Versioning:** `saveTreeJson()` auto-increments `version`, computes a SHA-256 hash of the tree content (excluding `x`/`y` and version fields), and triggers downloads of both `tree.json` and `changelog.json`. Forking creates a new `branchId`.

## localStorage keys

- `fwinonsm_unresolvedCases` — saved missing-rule cases
- `fwinonsm_sessions` — saved sessions
- `fwinonsm_sessionHistory` — list of previous session IDs (for autocomplete)

## Adding a new module

1. Create `modules/your-module.js` with named exports only (no default exports used in this codebase).
2. Import it in `app.js` or whichever module needs it.
3. If it needs DOM elements, add them to `modules/dom.js` rather than querying in place.
