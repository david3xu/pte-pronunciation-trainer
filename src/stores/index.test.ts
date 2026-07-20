import { describe, expect, it } from 'vitest';

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
});
