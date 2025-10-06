## PTE Vocabulary Data Ingestion Plan

### Goals
- Centralized, repeatable flow for adding new vocab datasets with IPA.
- Zero hardcoding: all wiring via `src/js/shared/Config.js`.
- Safe: validation, deduplication, and cache-busting are built-in.

### Source Format (Markdown)
- One file per dataset under `data/source/pte/vocabs/`.
- Recommended filename: `<dataset-id>-with-ipa.md`.
- Current parser expects ONE-LINE items in this exact pattern:

```markdown
1. obscure | /əbˈskjʊə/ — sounds like **uhb-SKYOOR** | /əbˈskjʊr/ — sounds like **uhb-SKYOOR**
```

Supported fields today (by extractor):
- english: before the first `|`
- pronunciation.british: `ipa` and `phonetic`
- pronunciation.american: `ipa` and `phonetic`

Notes:
- Category is fixed to `pte-fib-listening` by code; difficulty is inferred.
- Headers, metadata lines, and blank lines are ignored.
- Definitions, examples, or translations are NOT parsed unless we extend the extractor.

### Config Wiring (Single Source of Truth)
- In `src/js/shared/Config.js`:
  - Add or update `data.learningModes` with a new entry:
    - `{ id, label, dataset }` where `dataset` matches the markdown base name.
  - If needed, add a label to `data.categories`.
- Centralized dataset registry drives the pipeline build. Add entries under `pipeline.registry` only; no code changes required.

### Add a New Words Book (Codebase Update Steps)
The project now supports multiple “books” (learning modes) without hardcoding. To add a new book end‑to‑end:

1) Place source markdown
- Add `<your-dataset-id>-with-ipa.md` under `data/source/pte/vocabs/` using the one-line IPA format above.

2) Wire configuration in `src/js/shared/Config.js`
- learning mode (user-facing option):
```js
data: {
  learningModes: [
    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
    { id: 'pte-beginner',      label: '📗 PTE Beginner Vocabulary', dataset: 'pte-beginner-vocabulary-with-ipa' },
    // Add your new mode here
    { id: 'your-id',           label: '📘 Your Book Label',        dataset: 'your-dataset-id-with-ipa' }
  ],
  paths: {
    byMode: {
      'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
      'pte-beginner':      '/data/processed/pte-beginner-vocabulary.json',
      // Add your processed JSON path
      'your-id':           '/data/processed/your-dataset-id.json'
    }
  },
  categories: {
    // Optional category label per book
    'your-id': '📘 Your Book Label'
  }
}
```

- pipeline dataset registry (single source of truth):
```js
pipeline: {
  registry: [
    {
      id: 'pte-fib-listening',
      input: 'pte-fib-listening-with-ipa.md',
      fallback: 'fib-listening-vocabulary.md',
      output: 'pte-fib-listening-dataset.json',
      category: 'pte-fib-listening',
      description: 'PTE FIB Listening vocabulary with IPA',
      sourceType: 'pte-fib-listening-with-ipa',
      isDefault: true
    },
    {
      id: 'pte-beginner',
      input: 'pte-beginner-vocabulary-with-ipa.md',
      output: 'pte-beginner-vocabulary.json',
      category: 'pte-beginner',
      description: 'PTE Beginner high-frequency vocabulary with IPA',
      sourceType: 'pte-beginner-vocabulary-with-ipa'
    },
    // Add your source here
    {
      id: 'your-id',
      input: 'your-dataset-id-with-ipa.md',
      output: 'your-dataset-id.json',
      category: 'your-id',
      description: 'Your book description',
      sourceType: 'your-dataset-id-with-ipa'
    }
  ]
}
```

- validation (optional but recommended):
```js
validation: {
  requiredFiles: [
    'data/processed/pte-fib-listening-dataset.json',
    'data/processed/pte-beginner-vocabulary.json',
    // Add your processed file
    'data/processed/your-dataset-id.json'
  ]
}
```

3) Service worker caching (optional)
- To pre-cache the new processed dataset for offline use, add its path to `sw.js` lists (both dev and prod blocks):
```
/data/processed/your-dataset-id.json
```

4) Build and validate (single command builds all registry datasets)
```bash
npm run data:pte
npm run validate
```

5) Use the new book in the app
- Open Settings → Learning Mode and select your new book. No UI code changes are required:
  - `SettingsManager` auto-populates options from `data.learningModes`.
  - `PTEVocabularyManager` fetches the dataset via `data.paths.byMode[learningMode]`.
  - `UIController` updates automatically on settings change.

### Processing
1) Place the markdown file(s) in `data/source/pte/vocabs/`.
2) Run:
```bash
npm run data:pte
npm run validate
```
3) Outputs:
- `data/processed/pte-fib-listening-dataset.json` (or your dataset id)
- Reports under `data/reports/`

Notes:
- The pipeline removes duplicates (by case-insensitive english term).
- Dataset fetch in the app uses a cache-busting query param.

### Frontend Integration
- No code changes needed beyond `Config.js` for new modes.
- `SettingsManager` exposes the new learning mode automatically.
- `PTEVocabularyManager` loads the dataset path from `data.paths.byMode[learningMode]`.

### Selecting Different “Vocabulary Books” in Settings
In our app, each “book” maps to a `learningMode` entry in `Config.js`. To make a new book selectable:

1) Add a new learning mode in `src/js/shared/Config.js` under `data.learningModes`:
```js
// Example
data: {
  learningModes: [
    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
    { id: 'pte-fib-reading',   label: '📖 PTE FIB Reading',   dataset: 'pte-fib-reading-with-ipa' }
  ]
}
```

2) Ensure the dataset id corresponds to your processed markdown (the pipeline writes `data/processed/<dataset>.json`).

3) The Settings dropdown will populate automatically:
- `SettingsManager.getAvailableOptions('learningMode')` reads `data.learningModes` → populates Settings and the UI dropdown.
- `UIController` listens to settings changes and calls `pteVocabularyManager.setLearningMode(newMode)`.
- `PTEVocabularyManager` loads words for the selected mode and updates counts/filters.

4) Optional: categories per book
- If a book has its own category labels, add them under `data.categories` in `Config.js`.
- The Settings panel will update category options based on the selected `learningMode` through `SettingsManager` events.

That’s it: adding a `learningMode` entry is all that’s needed to make a new book appear and be selectable in Settings.

### Adding Multiple Datasets
- Preferred: expose each dataset as its own learning mode.
- Optional merged mode:
  - Extend `scripts/pte-data-pipeline.js` to read multiple markdowns, concatenate, deduplicate, and write a merged dataset.
  - Add a new learning mode pointing to the merged dataset id.

### Quality Checklist
- IPA fields present for most entries (UK/US).
- No duplicates (or acceptable post-dedupe count).
- Categories match `Config.js` or are omitted (auto-infer handles defaults).
- Validation passes (`npm run validate`).

### Deployment
```bash
npm run deploy:pte
```
Service worker will cache new assets; dataset requests already include cache-busting.

### Maintenance
- Keep all counts/thresholds in `Config.js` (`dataProcessing.termCounts`, difficulty thresholds, labels).
- Avoid per-file hardcoding. Always update config, not code.

