/* eslint-disable @typescript-eslint/no-explicit-any -- assertions inspect dynamic JSON shapes */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPracticeMode, loadDataset } from './datasetLoader';

let lastUrl = '';

const mockFetch = (body: unknown) => {
  const fetchMock = vi.fn(async (url: string) => {
    lastUrl = url;
    return { ok: true, json: async () => body } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
};

describe('datasetLoader', () => {
  beforeEach(() => {
    lastUrl = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns vocabulary items for a vocabulary dataset', async () => {
    mockFetch({ vocabulary: [{ english: 'hello', difficulty: 'easy' }] });

    const { items, mode } = await loadDataset('pte-fib-listening');

    expect(mode).toBe('pte-fib-listening');
    expect(items).toHaveLength(1);
    expect((items[0] as any).english).toBe('hello');
  });

  it('normalizes shadowing (answers) into vocabulary-shaped items', async () => {
    mockFetch({ answers: [{ title: 'A DI answer', fullText: 'long text here' }] });

    const { items } = await loadDataset('pte-di-shadowing');
    const item = items[0] as any;

    expect(item.english).toBe('A DI answer');
    expect(item.pronunciation.british.phonetic).toBe('DI Answer');
    expect(item.category).toBe('pte-di-shadowing');
  });

  it('normalizes RS/WFD segment items using content.sentence', async () => {
    mockFetch({
      items: [{ id: 's1', content: { sentence: 'Read this aloud', ipa: 'riːd' }, metadata: { difficulty: 'hard' } }],
    });

    const { items } = await loadDataset('pte-rs-segments');
    const item = items[0] as any;

    expect(item.english).toBe('Read this aloud');
    expect(item.ipa).toBe('riːd');
    expect(item.difficulty).toBe('hard');
  });

  it('returns practice items raw and resolves the path from the shared registry', async () => {
    mockFetch({ items: [{ id: 'q1', content: { sentence: 'Repeat me' } }] });

    const { items, mode } = await loadDataset('practice-repeat-sentence');

    expect(mode).toBe('practice-repeat-sentence');
    // Practice items stay raw (NOT transformed to vocabulary shape).
    expect((items[0] as any).english).toBeUndefined();
    expect((items[0] as any).content.sentence).toBe('Repeat me');
    // Path resolved via the byMode 'rs' key — one registry, no separate map.
    expect(lastUrl).toContain('pte-repeat-sentence-dataset.json');
  });

  it('rejects on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, statusText: 'Not Found' })) as unknown as typeof fetch
    );

    await expect(loadDataset('pte-fib-listening')).rejects.toThrow(/Failed to load/);
  });

  it('isPracticeMode identifies practice modes', () => {
    expect(isPracticeMode('practice-repeat-sentence')).toBe(true);
    expect(isPracticeMode('pte-fib-listening')).toBe(false);
  });
});
