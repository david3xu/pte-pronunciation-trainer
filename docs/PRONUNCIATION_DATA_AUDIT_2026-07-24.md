# Pronunciation Data Audit - 2026-07-24

## Scope

This audit covers every vocabulary source that the current PTE pipeline can
process:

- 4 explicitly registered books under `data/source/pte/{sgd,rl,ra,rs-wfd}`
- 32 auto-discovered Markdown books under `data/source/pte/vocabs/`
- 36 source files total

The audit checked source Markdown, the generated JSON under `data/processed/`,
the current pipeline implementation, dataset registration, and runtime display
and playback paths. No source or generated data was changed by this audit.

## Executive Summary

The data pipeline is structurally successful but does not validate
pronunciation quality. It accepts placeholders and fallback text as valid IPA,
lets two source files overwrite the same generated book, and preserves Markdown
formatting in learner-visible terms.

| Severity | Confirmed issue | Affected records | Current exposure |
| --- | --- | ---: | --- |
| Blocker | Literal `PLACEHOLDER` stored as IPA | 977 | Generated and path-registered essay book |
| Blocker | Fake `/ˈwɜːrd/` IPA fallback with `[IPA NEEDED]` | 4 | Generated and path-registered RS Core book |
| High | Two source files overwrite `pte-essay-topic-vocabulary.json` | 287 terms lost | Generated output is always empty |
| High | Literal Markdown emphasis in generated `english` fields | 1,404 | Four generated vocabulary books |
| High | Dictionary-confirmed / internally corroborated pronunciation defects | 6 | Active My RS & WFD book |
| Medium | Source spelling defect | 1 | Generated RS Core book |

The most immediate learner-facing errors are in **My RS & WFD PTE Words**, an
enabled vocabulary book. The 977-placeholder and RS Core books are currently
commented out of `data.learningModes`, but they remain generated and mapped in
`data.paths.byMode`; they can still be loaded by an id or re-enabled without a
quality gate.

## Method and Confidence

### Data inventory

| Measure | Result |
| --- | ---: |
| Numbered, pipe-delimited source rows | 26,945 |
| Rows with a full IPA plus `sounds like` pair | 24,817 |
| Distinct normalized terms in full-pair rows | 13,557 |
| Terms repeated across books | 5,193 |
| Terms with more than one IPA transcription | 1,957 |
| Terms with one IPA but multiple learner spellings | 1,269 |
| Consensus outliers requiring linguistic review | 658 |

Cross-book conflicts are **not** automatically errors. The books intentionally
mix British and American pronunciation, phrase-level entries, and slightly
different learner-friendly spellings. The 658 outliers are a future review
queue, not a defect count.

### Evidence levels

| Level | Meaning | Included as a confirmed issue? |
| --- | --- | --- |
| Deterministic | Placeholder, fake sentinel, output collision, or literal formatting leak | Yes |
| Dictionary-confirmed | Checked against a standard pronunciation source and compatible internal records | Yes |
| Internal-consensus candidate | Disagrees with repeated source records but could be an accent or notation variation | No; review only |

The repository has no licensed canonical pronunciation dictionary or local
phoneme lexicon. Therefore, this report does not claim that every one of the
1,957 IPA variants is wrong. It records only defects that can be demonstrated
from the data and pipeline, plus the small set of individually verified terms.

## Confirmed Defects

### 1. Placeholder IPA accepted as production data

**Source:** `data/source/pte/vocabs/pte-essay-90plus-filled-terms.md`  
**Generated output:** `data/processed/pte-essay-90plus-filled-terms.json`

All 977 entries use `/PLACEHOLDER/`, from source lines 10 through 1057. The
pipeline parses `PLACEHOLDER` as an IPA value and writes it to both British and
American variants with an empty phonetic field:

```json
{
  "english": "employee participation in decision-making",
  "pronunciation": {
    "british": { "ipa": "PLACEHOLDER", "phonetic": "" },
    "american": { "ipa": "PLACEHOLDER", "phonetic": "" }
  }
}
```

**Impact:** the UI can display `PLACEHOLDER` as a pronunciation. The browser or
premium TTS voice still receives the English text, so this does not directly
change the spoken audio. It is nevertheless invalid learner data and should not
be published as a pronunciation book.

**Required fix:** choose one of these paths before enabling the book:

1. Complete IPA and learner spelling for every term, with provenance.
2. Reclassify it as a non-pronunciation phrase bank and omit pronunciation
   fields from its UI.
3. Exclude the source from discovery until the data is complete.

### 2. Fake fallback IPA in RS Core

**Source:** `data/source/pte/vocabs/pte-rs-core-vocabulary-with-ipa.md`  
**Generated output:** `data/processed/pte-rs-core-vocabulary.json`

Four unrelated terms are assigned the IPA and learner spelling for `word`:

| Source line | Term | Invalid stored data |
| ---: | --- | --- |
| 150 | `prior to` | `/ˈwɜːrd/` - `WORD` - `[IPA NEEDED]` |
| 218 | `various approaches` | `/ˈwɜːrd/` - `WORD` - `[IPA NEEDED]` |
| 236 | `the student service center` | `/ˈwɜːrd/` - `WORD` - `[IPA NEEDED]` |
| 535 | `government` | `/ˈwɜːrd/` - `WORD` - `[IPA NEEDED]` |

**Required fix:** replace each row with verified British and American phrase
pronunciations, or remove the row until it has been reviewed. Do not use a
dummy IPA as a temporary value; the current parser cannot distinguish it from a
real pronunciation.

### 3. Active My RS & WFD book has verified pronunciation errors

**Source:** `data/source/pte/rs-wfd/pte-my-rs-wfd.md`  
**Generated output:** `data/processed/pte-my-rs-wfd.json`  
**Selector status:** enabled as `pte-my-rs-wfd` in `data.learningModes`

| Source line | Term | Current problem | Repair direction |
| ---: | --- | --- | --- |
| 1101 | `extracted` | `/ekˈstræktɪd/`, `ek-STRAK-tid` starts with the wrong vowel for the verb | Use `/ɪkˈstræktɪd/`, `ik-STRAK-tid` |
| 1102 | `extracurricular` | Both IPA variants omit or misplace the `/r/` before the stressed `/ɪk/` syllable | Re-enter the UK and US IPA from a dictionary source; preserve stress on `RIK` |
| 1103 | `extrapolates` | `/ekˈstræpəˌleɪts/`, `ek-STRAP-uh-layts` uses the wrong initial vowel | Use `/ɪkˈstræpəleɪts/`, `ik-STRAP-uh-layts` |
| 1104 | `extremely` | `/ekˈstriːmliː/`, `ek-STREEM-lee` uses the wrong initial vowel and an incorrect final long vowel | Use British `/ɪkˈstriːmli/`, American `/ɪkˈstrimli/`, `ik-STREEM-lee` |
| 1105 | `extremes` | `/ekˈstriːmz/`, `ek-STREEMZ` uses the wrong initial vowel | Use `/ɪkˈstriːmz/`, `ik-STREEMZ` |
| 2407 | `Wednesday` | `/ˈwenzdiː/`, `WENZ-dee` has the wrong final vowel | Use `/ˈwenzdeɪ/`, `WENZ-day` |

The first four `ex-` errors occur consecutively, so they must be reviewed as a
small local cluster, not corrected with a repository-wide `ek-` replacement.
For example, `extra` and the first syllable of `extracurricular` legitimately
use an `ek-` sound.

Reference checks used in this audit:

- [Cambridge: extract](https://dictionary.cambridge.org/pronunciation/english/extract)
- [Cambridge: extrapolate](https://dictionary.cambridge.org/pronunciation/english/extrapolate)
- [Cambridge: extreme](https://dictionary.cambridge.org/pronunciation/english/extreme)
- [Cambridge: extracurricular](https://dictionary.cambridge.org/pronunciation/english/extracurricular)
- [Cambridge: Wednesday](https://dictionary.cambridge.org/pronunciation/english/wednesday)

### 4. Source spelling defect

**Source:** `data/source/pte/vocabs/pte-rs-core-vocabulary-with-ipa.md:532`

```text
212. well preapred | /wel prɪˈperd/ - sounds like **wel prih-PAIRD**
```

`preapred` must be corrected to `prepared`. Unlike an IPA-only problem, this
also changes the English text passed to TTS and displayed to learners.

### 5. Generated output collision empties an IPA vocabulary book

Two auto-discovered filenames normalize to the same id and output filename:

| Source file | Normalized id | Terms produced by current extractor |
| --- | --- | ---: |
| `pte-essay-topic-vocabulary-with-ipa.md` | `pte-essay-topic-vocabulary` | 287 |
| `pte-essay-topic-vocabulary.md` | `pte-essay-topic-vocabulary` | 0 |

The second file is processed later and overwrites the first file's output. A
temporary run of the real pipeline shows both save events, ending with:

```text
Saved 287 items to pte-essay-topic-vocabulary.json
Saved 0 items to pte-essay-topic-vocabulary.json
```

**Impact:** `data/processed/pte-essay-topic-vocabulary.json` is empty even
though a 287-term IPA source exists. The path is registered in `AppConfig`; the
selector is currently commented out, but re-enabling it would expose an empty
book.

**Required fix:** remove or rename the non-IPA source from auto-discovery, or
make discovery fail when two files normalize to the same id. Prefer a single
canonical source named `pte-essay-topic-vocabulary-with-ipa.md`.

### 6. Markdown formatting leaks into 1,404 generated terms

`PTETermsExtractor.parsePTETermLine()` preserves `**bold**` in the term text.
The following generated datasets contain literal Markdown markers in their
`english` values:

| Generated book | Decorated entries | Selector status |
| --- | ---: | --- |
| `pte-essay-b1-examples-vocabulary.json` | 717 | Enabled |
| `pte-essay-b1-examples-vocabulary-24.json` | 465 | Disabled |
| `pte-essay-outcomes-vocabulary.json` | 212 | Disabled |
| `pte-plural-nouns-s-practice.json` | 10 | Enabled |
| **Total currently generated** | **1,404** | |

The source audit found 1,710 decorated source rows. The remaining 306 are in
the IPA essay-topic source affected by the output collision above; 287 of that
file's rows are extractable as IPA vocabulary, while phrase-label rows use a
different, currently unsupported source format.

`WordCard`, `VocabularyList`, and `VocabTypingInterface` call `cleanText()`
before rendering or speaking the displayed word. Other consumers can still
receive raw `english` values, so formatting must be normalized in the pipeline,
not left to individual UI call sites.

**Required fix:** strip basic Markdown formatting from `term` inside
`PTETermsExtractor.parsePTETermLine()` before assigning `english`. Add an
assertion that generated vocabulary terms contain none of `**`, backticks, or
underscore emphasis markers.

## Data-Quality Risks That Need Review, Not Blind Fixes

The cross-book comparison found substantial variation:

- 1,957 repeated terms have multiple IPA forms.
- 1,269 repeated terms retain one IPA form but use different learner spellings.
- 658 records are lone outliers against a repeated source consensus.

Many are expected British/American differences, optional rhotic `/r/`, or
stylistic learner spelling differences such as `fy` versus `fye`. Do **not**
mass-replace these values. Review them in batches with an authoritative source
and save the chosen British and American forms as the canonical record.

High-frequency terms that deserve early manual review include `education`,
`financial`, `globalization`, `government`, `literature`, `poverty`, and
`February`; they recur across many books with different IPA or learner-spelling
forms.

## Root Causes

1. `scripts/pte-data-pipeline.js` treats any slash-delimited text as IPA.
   `/PLACEHOLDER/` and `/ˈwɜːrd/` therefore pass unchanged.
2. `scripts/validate.js` validates JSON shape and duplicate English text only.
   It does not inspect either `pronunciation.british` or
   `pronunciation.american`.
3. `discoverVocabularyBooks()` derives ids by removing `-with-ipa.md` or `.md`
   and does not detect duplicate ids or duplicate output filenames.
4. The parser preserves Markdown emphasis in source terms.
5. There is no canonical pronunciation registry or source-provenance field to
   resolve cross-book variations safely.

## Recommended Fix Order

### Phase 1 - Stop known bad data from reaching learners

1. Correct the six verified IPA/phonetic records in `pte-my-rs-wfd.md`.
2. Correct `well preapred` to `well prepared`.
3. Replace the four RS Core fake fallbacks or remove those records.
4. Keep the 90+ essay book disabled until all 977 placeholders are resolved;
   consider excluding it from generation in the interim.
5. Resolve the essay-topic filename collision before enabling that book.

### Phase 2 - Make the pipeline reject these defects

Add a pronunciation-specific validation stage, for example
`pnpm run validate:pronunciation`, that reads both source and generated
datasets and writes `data/reports/pronunciation-validation-report.json`.

Required error checks:

- Reject `PLACEHOLDER`, `[IPA NEEDED]`, empty IPA, and known fake fallback
  values such as `/ˈwɜːrd/` for unrelated terms.
- Require at least one non-empty IPA field for every vocabulary term intended
  to show pronunciation.
- Reject generated `english` values containing Markdown emphasis delimiters.
- Fail on two discovered source files producing the same id or output filename.
- Fail when a source with extractable IPA rows generates an empty dataset.
- Report, but do not fail on, cross-book pronunciation conflicts until a
  canonical pronunciation registry exists.

`src/utils/validation/schemas.ts` already provides a useful starting point:
`alternativeVocabularyTermSchema` matches the pipeline's `english` plus nested
`pronunciation` shape. Wire this schema into the data validator rather than
creating a second incompatible representation.

### Phase 3 - Normalize at the source boundary

Update `PTETermsExtractor` to:

1. Normalize Markdown in the term before storing `english`.
2. Reject sentinel pronunciation strings before constructing a term object.
3. Preserve source file and line number in development reports.
4. Detect generated-id collisions before writing any output.
5. Treat a file with zero extractable terms as a warning or error, depending on
   whether it is explicitly registered as a vocabulary book.

Avoid silently copying one pronunciation into both accents when the source is
known to be accent-specific. If a source only has one verified form, represent
it as a single pronunciation or mark its accent scope explicitly.

## Recommended Review Workflow

### 1. Prepare a review batch

- Work on one source book at a time.
- Use a dictionary source that provides both British and American IPA.
- Keep an audit row with term, source URL, editor, review date, UK IPA, US IPA,
  and learner spelling.
- Separate phrase-level entries from single-word vocabulary; phrase IPA needs
  a different review standard.

### 2. Update source Markdown

Use the parser's supported format exactly:

```text
123. term | /British IPA/ - sounds like **BRITISH-STYLE** | /American IPA/ - sounds like **AMERICAN-STYLE**
```

Do not leave placeholders, prose notes, or linked-speech annotations inside the
IPA field. Keep teaching notes outside the machine-parsed line.

### 3. Generate and inspect

```bash
pnpm run data:pte
pnpm run validate
git diff -- data/source/pte data/processed
```

Confirm that only the expected source and generated dataset files changed, and
that an edited term has the intended nested `pronunciation` structure.

### 4. Run quality gates

```bash
pnpm run validate:all
pnpm test
pnpm run build:ts
```

Once the pronunciation validator exists, it should run before `validate:all`
can pass and before deployment builds are accepted.

### 5. Run learner-facing checks

For an active book, test one British and one American card in the app:

1. The displayed word is plain text, without Markdown delimiters.
2. IPA and `Sounds like` agree with the approved source.
3. The selected accent sends `en-GB` or `en-US` to TTS.
4. The lock-screen/background metadata does not expose placeholder text.

## Test Plan for the Pipeline Changes

Add focused tests for these cases:

| Test case | Expected result |
| --- | --- |
| `/PLACEHOLDER/` source row | Validation error with source line |
| `[IPA NEEDED]` row | Validation error with source line |
| `**bold term**` source row | Generated `english` is plain `bold term` |
| `foo-with-ipa.md` plus `foo.md` | Collision error before output is written |
| Valid source with 287 IPA rows | Generated dataset is non-empty |
| British and American variants differ legitimately | Accepted and recorded without a false error |
| One source form copied to both accents | Warning unless explicitly marked as shared |

## Completion Criteria

The pronunciation-data repair is complete when:

- No generated vocabulary entry contains `PLACEHOLDER`, `[IPA NEEDED]`, or a
  known fallback pronunciation.
- No generated `english` term includes Markdown emphasis markers.
- Each discovered source id maps to exactly one output file.
- `pte-essay-topic-vocabulary.json` contains the expected IPA terms.
- The seven confirmed content defects in this report are corrected and
  regenerated.
- The pronunciation validator reports zero errors.
- `pnpm run validate:all`, `pnpm test`, and `pnpm run build:ts` pass.

## Runtime Note

The IPA and `sounds like` fields are learner guidance. `WordCard` sends the
English text to `TTSEngine`, so fixing these data fields corrects the displayed
pronunciation and media metadata but does not by itself change Azure or browser
speech synthesis. Audio quality must be tested separately with the selected
voice and accent.
