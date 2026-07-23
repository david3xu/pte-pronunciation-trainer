/**
 * Centralized dataset loading + normalization.
 *
 * This is the single path for turning a dataset id into ready-to-use items.
 * Previously AppContent, SettingsPanel, and useAutoPlayController each fetched
 * and normalized datasets with near-duplicate logic; they now all call
 * loadDataset(). Path resolution comes from one registry
 * (AppConfig.data.paths.byMode); normalization handles every shape the
 * pipeline emits (vocabulary, answers/shadowing, RS/WFD segments, and raw
 * practice items) before anything is written to the store.
 */

import { appConfig } from '../../config/AppConfig';
import type { PracticeItem, VocabularyItem } from '../../types/dataset.types';

export type DatasetItem = VocabularyItem | PracticeItem;

export interface LoadedDataset {
  /** The dataset id, used as the store `mode` (drives practice-interface routing). */
  mode: string;
  /** Items normalized into the shape the practice UI expects for this dataset. */
  items: DatasetItem[];
}

export interface LoadDatasetOptions {
  signal?: AbortSignal;
}

// RS/ASQ/WFD are routed by a `practice-*` mode string (nested under the
// 'practice' study type), but their files live in the shared byMode registry
// under the task keys. This bridges the two id conventions so paths stay in
// a single registry, until the mode model is unified (see audit: consolidate
// the mode model). SWT is a writing task (nested under the reusable 'writing'
// study type via settings.writingMode, not under 'practice'), so it is loaded
// by its registry key directly; the entry below exists only so
// isPracticeMode recognizes it as needing the same raw, practice-item-shaped
// normalization as RS/ASQ/WFD.
const PRACTICE_MODE_TO_REGISTRY_KEY: Record<string, string> = {
  'practice-repeat-sentence': 'rs',
  'practice-answer-short-question': 'asq',
  'practice-write-from-dictation': 'wfd',
  'swt': 'swt',
};

/** True when the id is a dataset consumed raw by RS/ASQ/WFD/SWT, whether reached via the nested practice-* mode string or (for SWT) its own writing task key. */
export function isPracticeMode(datasetId: string): boolean {
  return datasetId in PRACTICE_MODE_TO_REGISTRY_KEY;
}

function resolveDatasetPath(datasetId: string): string {
  const byMode = appConfig.get<Record<string, string>>('data.paths.byMode');
  const processedPath = appConfig.get<string>('data.paths.processed');
  const registryKey = PRACTICE_MODE_TO_REGISTRY_KEY[datasetId] ?? datasetId;
  // Stable path, no cache-busting query: a stable URL is required for Workbox
  // data-cache hits and offline loads; the service worker (StaleWhileRevalidate)
  // and the HTTP cache handle freshness, and dataset content is versioned per deploy.
  return byMode?.[registryKey] || `/${processedPath}/${datasetId}-vocabulary.json`;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON payloads are untyped by nature */
function normalizeVocabularyDataset(data: any, datasetId: string): DatasetItem[] {
  let items = data.vocabulary || data.answers || data.items || [];

  // Shadowing datasets use `answers`; present each as a vocabulary card.
  if (data.answers) {
    items = items.map((answer: any) => ({
      english: answer.title || answer.fullText?.substring(0, 50),
      pronunciation: {
        british: { ipa: '', phonetic: 'DI Answer' },
        american: { ipa: '', phonetic: 'DI Answer' },
      },
      difficulty: 'normal',
      category: datasetId,
      source: datasetId,
      ...answer,
    }));
  }

  // RS/WFD segment datasets carry content.sentence; display them as vocabulary
  // (using `english` so they render like vocabulary items, no Play Audio button).
  if (items.length > 0 && items[0]?.content?.sentence) {
    items = items.map((item: any) => ({
      id: item.id,
      english: item.content.sentence,
      ipa: item.content.ipa,
      difficulty: item.metadata?.difficulty || 'normal',
      category: item.metadata?.category || 'general',
      wordCount: item.metadata?.wordCount,
      type: item.type,
      source: datasetId,
    }));
  }

  return items as DatasetItem[];
}

function normalizePracticeDataset(data: any): DatasetItem[] {
  // Practice datasets are consumed raw by the RS/ASQ/WFD interfaces.
  const items = data.items || data.sentences || data.questions || [];
  return items as DatasetItem[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Assign a stable, deterministic id to every item that lacks one. The id is
 * derived from the dataset id and the item's source order index, so it never
 * depends on display text and duplicate content items stay distinct. Existing
 * explicit ids are preserved. No timestamps or randomness are used.
 */
function withStableIds(items: DatasetItem[], datasetId: string): DatasetItem[] {
  return items.map((item, index) => {
    if (item.id) return item;
    return { ...item, id: `${datasetId}#${index}` } as DatasetItem;
  });
}

/**
 * Fetch and normalize a dataset by id. Rejects on network/HTTP failure or abort
 * so callers can surface errors; it never returns partially-normalized data.
 */
export async function loadDataset(
  datasetId: string,
  options: LoadDatasetOptions = {}
): Promise<LoadedDataset> {
  const path = resolveDatasetPath(datasetId);

  const response = await fetch(path, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Failed to load dataset "${datasetId}": ${response.statusText}`);
  }

  const data = await response.json();
  const normalized = isPracticeMode(datasetId)
    ? normalizePracticeDataset(data)
    : normalizeVocabularyDataset(data, datasetId);
  const items = withStableIds(normalized, datasetId);

  return { mode: datasetId, items };
}
