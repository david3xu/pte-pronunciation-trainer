/**
 * Regression tests for the capacity probe helpers.
 *
 * Each case here corresponds to an audit finding where the probe reported
 * available capacity that it had not actually established.
 */

import { describe, expect, it } from 'vitest';

import { assessQuotaHeadroom, normaliseRuntimeList, sameRegion } from './check-capacity.js';

describe('normaliseRuntimeList', () => {
  it('reads a flat array of runtime strings', () => {
    expect(normaliseRuntimeList(['NODE|22-lts', 'NODE|20-lts'])).toEqual([
      'NODE|22-lts',
      'NODE|20-lts',
    ]);
  });

  it('reads the object shape rather than discarding it', () => {
    const advertised = normaliseRuntimeList([
      { name: 'NODE|22-lts', os: 'linux' },
      { displayName: 'NODE|20-lts' },
      { runtimeVersion: 'PYTHON|3.12' },
    ]);

    expect(advertised).toEqual(['NODE|22-lts', 'NODE|20-lts', 'PYTHON|3.12']);
  });

  it('reads a mixed array', () => {
    expect(normaliseRuntimeList(['NODE|22-lts', { name: 'NODE|20-lts' }])).toEqual([
      'NODE|22-lts',
      'NODE|20-lts',
    ]);
  });

  it('returns nothing for an unusable payload rather than throwing', () => {
    expect(normaliseRuntimeList(undefined)).toEqual([]);
    expect(normaliseRuntimeList({})).toEqual([]);
    expect(normaliseRuntimeList([null, 42, { unrelated: 'value' }])).toEqual([]);
  });
});

describe('assessQuotaHeadroom', () => {
  const limits = [{ name: { value: 'ServerCount' }, properties: { limit: { value: 10 } } }];

  it('passes when remaining headroom covers the request', () => {
    const usages = [{ name: { value: 'ServerCount' }, properties: { usages: { value: 4 } } }];

    expect(assessQuotaHeadroom(limits, usages, 1)).toEqual({
      checked: 1,
      exhausted: [],
      unmatched: [],
    });
  });

  it('fails when the limit is large but usage has consumed it', () => {
    const usages = [{ name: { value: 'ServerCount' }, properties: { usages: { value: 10 } } }];

    const assessed = assessQuotaHeadroom(limits, usages, 1);

    expect(assessed.exhausted).toHaveLength(1);
    expect(assessed.exhausted[0]).toContain('limit 10, used 10');
  });

  it('fails when remaining headroom is smaller than the requested quantity', () => {
    const usages = [{ name: { value: 'ServerCount' }, properties: { usages: { value: 9 } } }];

    expect(assessQuotaHeadroom(limits, usages, 2).exhausted).toHaveLength(1);
  });

  it('reports an entry with no matching usage as unmatched rather than unused', () => {
    const assessed = assessQuotaHeadroom(limits, [], 1);

    expect(assessed.checked).toBe(0);
    expect(assessed.unmatched).toEqual(['ServerCount']);
    expect(assessed.exhausted).toEqual([]);
  });

  it('accepts the flattened usage shape', () => {
    const usages = [{ name: 'ServerCount', properties: { usages: 2 } }];

    expect(assessQuotaHeadroom(limits, usages, 1).checked).toBe(1);
  });
});

describe('sameRegion', () => {
  it('matches a display name against a short name', () => {
    expect(sameRegion('Australia East', 'australiaeast')).toBe(true);
  });

  it('does not match different regions', () => {
    expect(sameRegion('Australia Southeast', 'australiaeast')).toBe(false);
  });
});
