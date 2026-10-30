/**
 * Centralized dataset loading + normalization.
 *
 * This is the single path for turning a dataset id into ready-to-use items.
 * Previously AppContent, SettingsPanel, and useAutoPlayController each fetched
 * and normalized datasets with near-duplicate logic; they now all call
 * loadDataset(). Path resolution comes from one registry
 * (AppConfig.data.paths.byMode); normalization handles every shape the
 * pipeline emits (vocabulary and raw practice items) before anything is
 * written to the store.
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

// Writing tasks (nested under the reusable 'writing' study type via
// settings.writingMode) are loaded by their registry key directly; their
// entries here exist so isPracticeMode recognizes them as needing raw,
// practice-item-shaped normalization instead of the vocabulary shape.
const PRACTICE_MODE_TO_REGISTRY_KEY: Record<string, string> = {
  'essay-b1-terms': 'essay-b1-terms',
};

/** True when the id is a dataset consumed raw by a writing task. */
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
function normalizeVocabularyDataset(data: any): DatasetItem[] {
  const items = data.vocabulary || data.items || [];
  return items as DatasetItem[];
}

function normalizePracticeDataset(data: any): DatasetItem[] {
  // Writing datasets are consumed raw by the typing interface.
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
    : normalizeVocabularyDataset(data);
  const items = withStableIds(normalized, datasetId);

  return { mode: datasetId, items };
}
