import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from './index';
import type { VocabularyTerm } from '../types/dataset.types';

const dataset: VocabularyTerm[] = [
  {
    word: 'alpha',
    ipa: { single: '/alpha/' },
    phonetic: { single: 'alpha' },
    difficulty: 'easy',
    category: 'pte-fib-listening',
  },
  {
    word: 'bravo',
    ipa: { single: '/bravo/' },
    phonetic: { single: 'bravo' },
    difficulty: 'normal',
    category: 'pte-fib-listening',
  },
  {
    word: 'charlie',
    ipa: { single: '/charlie/' },
    phonetic: { single: 'charlie' },
    difficulty: 'hard',
    category: 'pte-fib-listening',
  },
];

beforeEach(() => {
  const store = useAppStore.getState();
  store.progress.resetProgress();
  store.vocabulary.clearDataset();
  // Clear per dataset navigation and completion memory so tests stay isolated.
  useAppStore.setState((state) => ({
    progress: {
      ...state.progress,
      activeDatasetId: null,
      indexByDataset: {},
      completedItems: new Set<string>(),
      completedItemsByDataset: {},
    },
  }));
});

describe('store navigation', () => {
  it('setDataset initializes current item, audio index, and progress together', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'test-mode');

    const state = useAppStore.getState();
    expect(state.vocabulary.currentItem).toBe(dataset[0]);
    expect(state.audio.currentIndex).toBe(0);
    expect(state.progress.currentIndex).toBe(0);
    expect(state.progress.totalItems).toBe(dataset.length);
  });

  it('goToItem updates current item, audio index, and progress together', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'test-mode');
    const didNavigate = store.vocabulary.goToItem(2);

    const state = useAppStore.getState();
    expect(didNavigate).toBe(true);
    expect(state.vocabulary.currentItem).toBe(dataset[2]);
    expect(state.audio.currentIndex).toBe(2);
    expect(state.progress.currentIndex).toBe(2);
    expect(state.progress.totalItems).toBe(dataset.length);
  });

  it('goToItem leaves state unchanged when the target index is out of range', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'test-mode');
    store.vocabulary.goToItem(1);
    const before = useAppStore.getState();

    const didNavigate = store.vocabulary.goToItem(10);
    const after = useAppStore.getState();

    expect(didNavigate).toBe(false);
    expect(after.vocabulary.currentItem).toBe(before.vocabulary.currentItem);
    expect(after.audio.currentIndex).toBe(before.audio.currentIndex);
    expect(after.progress.currentIndex).toBe(before.progress.currentIndex);
    expect(after.progress.totalItems).toBe(before.progress.totalItems);
  });

  it('goToItem records the visited index per dataset', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.vocabulary.goToItem(2);

    expect(useAppStore.getState().progress.indexByDataset['book-a']).toBe(2);
  });

  it('restores the saved index per dataset when switching datasets', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.vocabulary.goToItem(2);

    // Switching to another dataset starts at its first item.
    store.vocabulary.setDataset(dataset, 'book-b');
    expect(useAppStore.getState().progress.currentIndex).toBe(0);
    expect(useAppStore.getState().progress.activeDatasetId).toBe('book-b');

    // Switching back restores the previous position for that dataset.
    store.vocabulary.setDataset(dataset, 'book-a');
    const state = useAppStore.getState();
    expect(state.progress.currentIndex).toBe(2);
    expect(state.audio.currentIndex).toBe(2);
    expect(state.vocabulary.currentItem).toBe(dataset[2]);
    expect(state.progress.activeDatasetId).toBe('book-a');
  });

  it('starts a dataset with no saved index at the first item', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'brand-new-book');

    const state = useAppStore.getState();
    expect(state.progress.currentIndex).toBe(0);
    expect(state.vocabulary.currentItem).toBe(dataset[0]);
  });

  it('filterByDifficulty updates the visible total and resets to the first visible item', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.vocabulary.goToItem(2);

    store.vocabulary.filterByDifficulty('hard');
    let state = useAppStore.getState();
    expect(state.progress.totalItems).toBe(1);
    expect(state.progress.currentIndex).toBe(0);
    expect(state.vocabulary.currentItem).toBe(dataset[2]);

    store.vocabulary.filterByDifficulty('all');
    state = useAppStore.getState();
    expect(state.progress.totalItems).toBe(dataset.length);
    expect(state.progress.currentIndex).toBe(0);
    expect(state.vocabulary.currentItem).toBe(dataset[0]);
  });

  it('resetProgress clears the active dataset id and per dataset index memory', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.vocabulary.goToItem(2);
    expect(useAppStore.getState().progress.indexByDataset['book-a']).toBe(2);
    expect(useAppStore.getState().progress.activeDatasetId).toBe('book-a');

    store.progress.resetProgress();

    const state = useAppStore.getState();
    expect(state.progress.activeDatasetId).toBe(null);
    expect(state.progress.indexByDataset).toEqual({});
  });

  it('updateProgress records the index under the active dataset', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.progress.updateProgress(1, dataset.length);

    const state = useAppStore.getState();
    expect(state.progress.currentIndex).toBe(1);
    expect(state.progress.totalItems).toBe(dataset.length);
    expect(state.progress.indexByDataset['book-a']).toBe(1);
  });

  it('updateProgress leaves the per dataset memory untouched when no dataset is active', () => {
    const store = useAppStore.getState();

    store.progress.updateProgress(3, dataset.length);

    const state = useAppStore.getState();
    expect(state.progress.currentIndex).toBe(3);
    expect(state.progress.totalItems).toBe(dataset.length);
    expect(state.progress.indexByDataset).toEqual({});
  });

  it('marks completed items per dataset without leaking to other datasets', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.progress.markItemCompleted('alpha', true);
    store.progress.markItemCompleted('bravo', true);

    let state = useAppStore.getState();
    expect(state.progress.completedItems.size).toBe(2);
    expect(state.progress.completedItemsByDataset['book-a']).toEqual(['alpha', 'bravo']);

    store.vocabulary.setDataset(dataset, 'book-b');
    state = useAppStore.getState();
    expect(state.progress.completedItems.size).toBe(0);
    expect(state.progress.completedItemsByDataset['book-b']).toBeUndefined();

    store.progress.markItemCompleted('charlie', false);
    state = useAppStore.getState();
    expect(state.progress.completedItems.has('charlie')).toBe(true);
    expect(state.progress.completedItems.has('alpha')).toBe(false);
    expect(state.progress.completedItemsByDataset['book-a']).toEqual(['alpha', 'bravo']);
    expect(state.progress.completedItemsByDataset['book-b']).toEqual(['charlie']);
  });

  it('restores the completed set and count when switching between datasets', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.progress.markItemCompleted('alpha', true);

    store.vocabulary.setDataset(dataset, 'book-b');
    store.progress.markItemCompleted('bravo', true);
    store.progress.markItemCompleted('charlie', true);
    expect(useAppStore.getState().progress.completedItems.size).toBe(2);

    store.vocabulary.setDataset(dataset, 'book-a');
    let state = useAppStore.getState();
    expect(state.progress.completedItems.size).toBe(1);
    expect(state.progress.completedItems.has('alpha')).toBe(true);

    store.vocabulary.setDataset(dataset, 'book-b');
    state = useAppStore.getState();
    expect(state.progress.completedItems.size).toBe(2);
    expect(state.progress.completedItems.has('bravo')).toBe(true);
    expect(state.progress.completedItems.has('charlie')).toBe(true);
  });

  it('markCurrentItemCompleted marks the active item by its stable id', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.vocabulary.goToItem(1);

    const marked = store.progress.markCurrentItemCompleted(true);
    const state = useAppStore.getState();
    expect(marked).toBe(true);
    expect(state.progress.completedItems.has('bravo')).toBe(true);
    expect(state.progress.completedItemsByDataset['book-a']).toEqual(['bravo']);
  });

  it('markCurrentItemCompleted returns false when there is no current item', () => {
    const store = useAppStore.getState();

    const marked = store.progress.markCurrentItemCompleted(true);

    expect(marked).toBe(false);
    expect(useAppStore.getState().progress.completedItems.size).toBe(0);
  });

  it('stores completed ids in a persistence safe shape', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.progress.markItemCompleted('alpha', true);

    const map = useAppStore.getState().progress.completedItemsByDataset;
    const bookA = map['book-a'] ?? [];
    expect(Array.isArray(map['book-a'])).toBe(true);
    expect(bookA.every((id) => typeof id === 'string')).toBe(true);
    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
  });

  it('resetProgress clears the per dataset completed map', () => {
    const store = useAppStore.getState();

    store.vocabulary.setDataset(dataset, 'book-a');
    store.progress.markItemCompleted('alpha', true);
    expect(useAppStore.getState().progress.completedItemsByDataset['book-a']).toEqual(['alpha']);

    store.progress.resetProgress();
    const state = useAppStore.getState();
    expect(state.progress.completedItemsByDataset).toEqual({});
    expect(state.progress.completedItems.size).toBe(0);
  });

  it('derives completion ids for normalized items that use english', () => {
    const store = useAppStore.getState();
    const englishDataset = [
      { english: 'obscure' },
      { english: 'clusters' },
    ] as unknown as VocabularyTerm[];

    store.vocabulary.setDataset(englishDataset, 'book-english');
    store.vocabulary.goToItem(1);

    const marked = store.progress.markCurrentItemCompleted(true);
    const state = useAppStore.getState();
    expect(marked).toBe(true);
    expect(state.progress.completedItems.has('clusters')).toBe(true);
    expect(state.progress.completedItemsByDataset['book-english']).toEqual(['clusters']);
  });

  it('prefers an explicit id over content fields when one is present', () => {
    const store = useAppStore.getState();
    const idDataset = [
      { id: 'term-1', english: 'obscure' },
    ] as unknown as VocabularyTerm[];

    store.vocabulary.setDataset(idDataset, 'book-id');
    store.vocabulary.goToItem(0);

    const marked = store.progress.markCurrentItemCompleted(true);
    const state = useAppStore.getState();
    expect(marked).toBe(true);
    expect(state.progress.completedItems.has('term-1')).toBe(true);
    expect(state.progress.completedItems.has('obscure')).toBe(false);
  });

  it('tracks completion by a generated loader style id, not shared content text', () => {
    const store = useAppStore.getState();
    // Two items with duplicate english text but distinct loader generated ids.
    const loaderShaped = [
      { id: 'pte-fib-listening#0', english: 'alpha' },
      { id: 'pte-fib-listening#1', english: 'alpha' },
    ] as unknown as VocabularyTerm[];

    store.vocabulary.setDataset(loaderShaped, 'pte-fib-listening');
    store.vocabulary.goToItem(1);
    const marked = store.progress.markCurrentItemCompleted(true);

    const state = useAppStore.getState();
    expect(marked).toBe(true);
    expect(state.progress.completedItems.has('pte-fib-listening#1')).toBe(true);
    expect(state.progress.completedItems.has('pte-fib-listening#0')).toBe(false);
    expect(state.progress.completedItems.has('alpha')).toBe(false);
  });
});
