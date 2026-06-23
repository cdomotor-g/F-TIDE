# FWIN-ONSM-Matrix

A browser-based decision-support tool for structured evaluations of flood warning tower infrastructure. Load a decision tree (`tree.json`), walk through a guided Q&A, and export a self-contained HTML report.

## Quick start

Available through GitHub Pages at: https://cdomotor-g.github.io/F-TIDE/

No installation required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8080
```

Then load `tree.json` using the **Load tree.json** button.

## How it works

1. **Load** — drag in a `tree.json` file to start a session.
2. **Evaluate** — answer each question by clicking an option. The tool tracks your decision path and shows approximate progress.
3. **Comment** — add notes on any question; they appear in the final report.
4. **Export** — when you reach an outcome, click **Export report** to download a printable HTML report containing the full decision path, outcome, risk score, and a snapshot of the rule set used.

## Delivery Risk Score

Each outcome now displays a **Delivery Risk Score** — a numeric total accumulated from the `riskScore` value on each answer chosen during the session. The score is resolved against a band table defined in `tree.json` and displayed alongside the recommendation:

| Band | Score range | Meaning |
|---|---|---|
| Low | 0–4 | Routine, well-defined scope |
| Medium | 5–9 | Elevated cost or complexity — monitor |
| High | 10–15 | Significant budget exposure — flag for planning |
| Critical | 16+ | Major risk — escalate before scheduling |

The score and band are included in exported HTML reports so the delivery team can use them directly for prioritisation and scheduling decisions.

Scores are subtracted correctly when navigating back through the tree, and reset on restart. The risk bands are configurable in `tree.json` via the top-level `riskBands` array.

## tree.json format

The decision tree is a JSON file with this structure:

```json
{
  "title": "My Rule Set",
  "version": "v1.0",
  "startNode": "Q_START",
  "riskBands": [
    { "max": 4,  "label": "Low" },
    { "max": 9,  "label": "Medium" },
    { "max": 15, "label": "High" },
    {            "label": "Critical" }
  ],
  "nodes": {
    "Q_START": {
      "id": "Q_START",
      "question": "Is the tower within a flood-prone zone?",
      "icon": "🌊",
      "x": 100,
      "y": 200,
      "options": [
        { "label": "Yes", "next": "Q_NEXT",    "riskScore": 6 },
        { "label": "No",  "next": "RESULT_OK", "riskScore": 0 }
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

Each option's `riskScore` is an integer (defaults to `0` if omitted). Scores accumulate as the user progresses and are subtracted when navigating back. The final total is matched against `riskBands` — the first band whose `max` is ≥ the score is used; the last band (no `max`) is the catch-all.

`x` and `y` on nodes and results are Cytoscape.js canvas positions, written back when you drag items in the tree map and persisted when you save `tree.json`. They are excluded from the SHA-256 content hash so layout changes don't increment the version. See `tree_schema.json` (or click **Show tree schema** in the app) for the full schema.

## Editing the tree in-browser

- Click **Edit this node** to open the guided editor for the current node.
- Use the **Tree map** to visualise the full tree, click any node to edit it, and drag nodes to rearrange.
- Use **New question** / **New result** to add payloads without leaving the editor.
- **Apply + save tree.json** downloads an updated `tree.json` and a `changelog.json` with a SHA-256 content hash for audit purposes.
- **Fork branch** creates a named branch of the tree for parallel rule-set development.

## Missing rules

If a path leads to an undefined target, the tool flags it as a **Missing Rule**. You can:
- Apply an existing result to that branch immediately (persists when you save `tree.json`).
- Save the unresolved case with notes to `localStorage` for later review.

## Session persistence

Sessions and unresolved cases are saved to browser `localStorage`. Previous session IDs are offered as autocomplete when linking a new session to a prior one via **Supersedes session**.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell |
| `app.js` | Entry point — event wiring and init |
| `modules/` | JS modules (state, session flow, editor, tree view, file I/O, validation) |
| `report.js` | CSS injected into exported HTML reports |
| `tree.json` | Default decision tree |
| `tree_schema.json` | JSON Schema for `tree.json` |
| `changelog.json` | Version history produced when saving `tree.json` |
