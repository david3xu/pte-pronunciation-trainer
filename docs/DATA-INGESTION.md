## PTE Vocabulary Data Ingestion Plan

### Goals
- Centralized, repeatable flow for adding new vocab datasets with IPA.
- Zero hardcoding: all wiring via `src/js/shared/Config.js`.
- Safe: validation, deduplication, and cache-busting are built-in.

### Source Format (Markdown)
- One file per dataset under `data/source/pte/vocabs/`.
- Recommended filename: `<dataset-id>-with-ipa.md`.
- Item structure (example):

```markdown
### obscure
IPA (UK): /əbˈskjʊə/
IPA (US): /əbˈskjʊr/
Phonetic (UK): uhb-SKYOOR
Phonetic (US): uhb-SKYOOR
Category: pte-fib-listening
```

Required: english term (as heading). Optional: category, difficulty; IPA strongly recommended.

### Config Wiring (Single Source of Truth)
- In `src/js/shared/Config.js`:
  - Add or update `data.learningModes` with a new entry:
    - `{ id, label, dataset }` where `dataset` matches the markdown base name.
  - If needed, add a label to `data.categories`.
  - For pipeline input, either:
    - Replace `pipeline.dataSources.primary` with the new `<dataset-id>-with-ipa.md`, or
    - Extend the pipeline to accept multiple sources when creating merged modes.

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
- `PTEVocabularyManager` loads the dataset path from config.

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

