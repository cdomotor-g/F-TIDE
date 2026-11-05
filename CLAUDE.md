# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a browser (or serve it with any static file server):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, no linter config, and no package.json. The codebase is plain vanilla JS with no transpilation.

## Build step — IMPORTANT

`index.html` loads **`app.bundle.js`**, not the ES modules. The bundle is generated from `modules/*.js` + `app.js`. After editing any module you MUST regenerate it:

```bash
node scripts/build-bundle.mjs
```

Never edit `app.bundle.js` by hand — change the modules and rebuild, or the two copies drift apart (this has caused real bugs where fixes in `modules/` never reached the browser).

## Architecture

FWIN-ONSM-Matrix is a single-page browser app for running structured infrastructure evaluations using a decision tree loaded from `tree.json`.

**Entry point:** `index.html` loads `report.js` as a regular script (which sets the `REPORT_CSS` global used when building HTML reports), then loads `app.bundle.js` (the generated concatenation of the modules below plus `app.js`). `app.js` wires up all event listeners and initialises the UI. The `modules/` files are the source of truth; the bundle exists so the app also works without an ES-module-capable setup.

**Modules (`/modules/`):**

| File | Responsibility |
|---|---|
| `state.js` | Single exported `state` object — all mutable runtime state lives here |
| `dom.js` | Cached DOM element references exported as `els` — import this instead of querying the DOM |
| `constants.js` | Storage keys and the icon emoji palette |
| `runner.js` | Session flow: `renderNode`, `selectOption`, `renderResult`, `restart`, `goBack`, missing-rule handling |
| `file-ops.js` | Load `tree.json`, save/download updated tree + changelog, fork branches, export HTML reports, persist sessions to `localStorage` |
| `editor.js` | In-browser node/result editor — guided form and raw JSON tab, create/delete/rename payloads |
| `tree-view.js` | Cytoscape.js visual tree map (loaded from CDN in `index.html`), mini-tree sidebar, tables view, right-click answer linking (context menu + link mode) |
| `validation.js` | Tree structure validation — called on load and before applying edits |
| `stations.js` | FReD.csv loading + CSV parser, the station-search modal, and populating the session-details station fields (Type/State/LGA/Owner/HUB/Assessment Report) |
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

`option.next` is a plain string ID pointing to either a node or result. It may be an empty string while a node is unwired — nodes can be created first and their answers linked later by right-clicking them in the tree map. Unwired/orphan nodes and dangling targets are load-time *warnings*, not errors (the runner falls back to a missing-rule result at runtime). `x`/`y` on nodes and results are Cytoscape.js canvas positions written back when you drag items in the tree map. They are excluded from the SHA-256 content hash so layout changes don't increment the version. `tree_schema.json` reflects all of this accurately.

**Versioning:** `saveTreeJson()` auto-increments `version`, computes a SHA-256 hash of the tree content (excluding `x`/`y` and version fields), and triggers downloads of both `tree.json` and `changelog.json`. Forking creates a new `branchId`.

## localStorage keys

- `fwinonsm_unresolvedCases` — saved missing-rule cases
- `fwinonsm_sessions` — saved sessions
- `fwinonsm_sessionHistory` — list of previous session IDs (for autocomplete)

## Adding a new module

1. Create `modules/your-module.js` with named exports only (no default exports used in this codebase).
2. Import it in `app.js` or whichever module needs it.
3. If it needs DOM elements, add them to `modules/dom.js` rather than querying in place.

<!-- run-summary:start · the same in every repository: change it in cdomotor-g/atlas docs/run-summary.md, then copy it out with tools/run-summary.mjs -->
## Run summary — how to end a run
When you finish a piece of work, end your reply with this report, filled in. A short reply that only answers a question (no work done) skips it and doesn't use up a run number.

```markdown
---
# 🏁 THIS RUN SUMMARY (Run N)
> **You asked:** what I asked for, in a few words.
>
> What this run achieved, in one plain sentence. **Needs you:** Y1, Q1 — or **Nothing needs you.**

## ✅ Done
- **D1** What changed and where, with a link when there is one (commit, issue, page).

## 🧪 Checks
- **C1** 🟢 What was checked, and what it showed.

## 🚧 Not done
- **N1** What was skipped, failed or is left for later, and why.

## 🙋 Needs you
- **Y1** What needs your hands, money or say, step by step.

## 💻 Needs your sign-in
- **S1** What needs only your sign-in, as a brief to paste into Dispatch.

## ❓ Questions
- **Q1** The question. Options as **Q1.1**, **Q1.2**, the one you'd pick marked *(recommended)*.
```

- **The marker.** A horizontal rule, then the 🏁 heading word for word, so I can find it by scrolling. N counts the summaries in this chat: Run 1 first, then one more than the last marker. A new chat starts at Run 1. Use it once per reply, at the start of the report: everything above it is working notes, and nothing comes after the report.
- **What I asked, then what came of it.** Straight under the heading, **You asked:** and my request in ten words at most (several asks joined with ·), so I can tell which request a report answers when I scroll back. Then one plain sentence on what the run achieved, listing every Y, S and Q point, or saying nothing needs me.
- **Same sections, same letters, every repository.** These headings, emoji and order; leave out any that would be empty, and add none. Every point starts with its section's letter and number: **D** done · **C** checks · **N** not done · **Y** needs you · **S** needs your sign-in · **Q** questions. Nest with a dot (**D2.1**). Numbers restart each run, so when I reply "Q1: yes" or "Run 2 Y1", that's the point I mean.
- **Checks show their result:** 🟢 passed · 🟡 passed with a warning · 🔴 failed · ⚪ not run, and why. Never call something fixed or passing that wasn't checked.
- **Needs you, or needs your sign-in.** **Y** is only what needs my hands, money or say: hardware, a site, an order, a decision. What needs only my sign-in (a dashboard, a setting, an account page) is **S**: do it yourself if this session can use my computer; otherwise write it as a brief I can paste into Dispatch.
- **Short.** One line a point, two at most: what happened and what it means for me, not how it was done.
- **Plain words.** I'm not a software engineer, and I may read only this report. Prefer the everyday word. Where a technical term, an abbreviation, a word used in a special sense, or a mention of something I may not have seen (a file, a tool, an earlier step) is the clearest choice, add a few words saying what it is the first time. Name a thing by what it does, not only by its file or function name.
<!-- run-summary:end -->
