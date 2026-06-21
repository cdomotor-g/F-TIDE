# FWIN-TIDE

**F**lood **W**arning **I**nfrastructure — **T**ower **I**nfrastructure **D**ecision **E**ngine

A browser-based decision-support tool for conducting structured assessments of flood warning tower infrastructure. Load a decision tree (`tree.json`), walk through a guided Q&A, and export a self-contained HTML assessment report.

## Quick start

No installation required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8080
```

Then load `tree.json` using the **Load tree.json** button.

## How it works

1. **Load** — drag in a `tree.json` file to start a session.
2. **Assess** — answer each question by clicking an option. The tool tracks your decision path and shows approximate progress.
3. **Comment** — add notes on any question; they appear in the final report.
4. **Export** — when you reach an outcome, click **Export assessment** to download a printable HTML report containing the full decision path, outcome, and a snapshot of the rule set used.

## tree.json format

The decision tree is a JSON file with this structure:

```json
{
  "title": "My Rule Set",
  "version": "v1.0",
  "startNode": "Q_START",
  "nodes": {
    "Q_START": {
      "id": "Q_START",
      "question": "Is the tower within a flood-prone zone?",
      "icon": "🌊",
      "x": 100,
      "y": 200,
      "options": [
        { "label": "Yes", "next": "Q_NEXT" },
        { "label": "No",  "next": "RESULT_OK" }
      ],
      "links": [{ "label": "Reference map", "url": "https://example.com/map" }]
    }
  },
  "results": {
    "RESULT_OK": {
      "id": "RESULT_OK",
      "title": "No action required",
      "rationale": "The tower is outside the flood zone."
    }
  }
}
```

`x` and `y` on nodes and results are Cytoscape.js canvas positions, written back when you drag items in the tree map and persisted when you save `tree.json`. They are excluded from the SHA-256 content hash so layout changes don't increment the version. See `tree_schema.json` (or click **Show tree schema** in the app) for the full schema.

## Editing the tree in-browser

- Click **Edit this node** to open the guided editor for the current node.
- Use the **Tree map** to visualise the full tree, click any node to edit it, and drag nodes to rearrange.
- Use **New question** / **New result** to add payloads without leaving the editor.
- **Apply + save tree.json** downloads an updated `tree.json` and a `changelog.json` with a SHA-256 content hash for audit purposes.
- **Fork branch** creates a named branch of the tree for parallel rule-set development.

## Missing rules

If an assessment path leads to an undefined target, the tool flags it as a **Missing Rule**. You can:
- Apply an existing result to that branch immediately (persists when you save `tree.json`).
- Save the unresolved case with notes to `localStorage` for later review.

## Session persistence

Assessment sessions and unresolved cases are saved to browser `localStorage`. Previous assessment IDs are offered as autocomplete when linking a new assessment to a prior one via **Supersedes assessment**.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell |
| `app.js` | Entry point — event wiring and init |
| `modules/` | JS modules (state, assessment flow, editor, tree view, file I/O, validation) |
| `report.js` | CSS injected into exported HTML reports |
| `tree.json` | Default decision tree |
| `tree_schema.json` | JSON Schema for `tree.json` |
| `changelog.json` | Version history produced when saving `tree.json` |
