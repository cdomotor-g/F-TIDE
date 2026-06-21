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

FWIN-TIDE is a single-page browser app for conducting structured infrastructure assessments using a decision tree loaded from `tree.json`.

**Entry point:** `index.html` loads `report.js` as a regular script (which sets the `REPORT_CSS` global used when building HTML reports), then loads `app.js` as an ES module. `app.js` wires up all event listeners and initialises the UI.

**Modules (`/modules/`):**

| File | Responsibility |
|---|---|
| `state.js` | Single exported `state` object — all mutable runtime state lives here |
| `dom.js` | Cached DOM element references exported as `els` — import this instead of querying the DOM |
| `constants.js` | Storage keys and the icon emoji palette |
| `assessment.js` | Assessment flow: `renderNode`, `selectOption`, `renderResult`, `restart`, `goBack`, missing-rule handling |
| `file-ops.js` | Load `tree.json`, save/download updated tree + changelog, fork branches, export HTML reports, persist sessions to `localStorage` |
| `editor.js` | In-browser node/result editor — guided form and raw JSON tab, create/delete/rename payloads |
| `tree-view.js` | Cytoscape.js visual tree map (loaded from CDN in `index.html`), mini-tree sidebar, tables view |
| `validation.js` | Tree structure validation — called on load and before applying edits |
| `utils.js` | Pure helpers: `clone`, `escapeHtml`, `escapeAttr`, `slugify`, `downloadFile`, etc. |

**Circular imports:** `assessment.js`, `editor.js`, `tree-view.js`, and `file-ops.js` import from each other. This is intentional and resolved via ES module live bindings — functions are only called at runtime after all modules have evaluated.

## tree.json format

The decision tree is a JSON file validated against `tree_schema.json`. Key fields:

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
      "options": [{ "label": "Yes", "next": "ANOTHER_NODE_OR_RESULT_ID" }],
      "links": [{ "label": "Reference doc", "url": "https://..." }]
    }
  },
  "results": {
    "RESULT_ID": {
      "id": "RESULT_ID",
      "title": "...",
      "rationale": "..."
    }
  }
}
```

Note: at runtime `option.next` is a plain string ID (not the object form shown in the JSON Schema — the schema predates the current implementation).

**Versioning:** `saveTreeJson()` auto-increments `version`, computes a SHA-256 hash of the tree content (excluding layout/version fields), and triggers downloads of both `tree.json` and `changelog.json`. Forking creates a new `branchId`.

## localStorage keys

- `floodDecisionTool_unresolvedCases` — saved missing-rule cases
- `floodDecisionTool_analysisSessions` — saved assessment sessions
- `floodDecisionTool_assessmentHistory` — list of previous assessment IDs (for autocomplete)

## Adding a new module

1. Create `modules/your-module.js` with named exports only (no default exports used in this codebase).
2. Import it in `app.js` or whichever module needs it.
3. If it needs DOM elements, add them to `modules/dom.js` rather than querying in place.
