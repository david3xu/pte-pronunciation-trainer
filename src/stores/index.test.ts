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
  // Clear per dataset navigation memory so each test starts isolated.
  useAppStore.setState((state) => ({
    progress: { ...state.progress, activeDatasetId: null, indexByDataset: {} },
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
});
