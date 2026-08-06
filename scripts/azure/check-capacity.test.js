/**
 * Regression tests for the capacity probe helpers.
 *
 * Each case here corresponds to an audit finding where the probe reported
 * available capacity that it had not actually established.
 */

import { describe, expect, it } from 'vitest';

import {
  assessQuotaHeadroom,
  findResourceTypeLocations,
  normaliseRuntimeList,
  resolveResourceLocation,
  sameRegion,
} from './check-capacity.js';

describe('findResourceTypeLocations', () => {
  /**
   * Sanitized excerpt of az provider show --namespace Microsoft.Cache. Note the
   * casing: the ARM type is written Microsoft.Cache/redis while the provider reports
   * the type name as Redis. A case sensitive filter finds nothing here, which is what
   * made the Redis probe look like an unreadable response with an empty error.
   */
  const cacheResourceTypes = [
    { resourceType: 'Redis', locations: ['Australia East', 'East US', 'West Europe'] },
    { resourceType: 'redisEnterprise', locations: ['Australia Central', 'East US'] },
    { resourceType: 'locations/operationResults', locations: [] },
  ];

  it('matches the resource type without regard to case', () => {
    const locations = findResourceTypeLocations(cacheResourceTypes, 'redis');

    expect(locations).toEqual(['Australia East', 'East US', 'West Europe']);
  });

  it('does not match a different type that merely shares a prefix', () => {
    const locations = findResourceTypeLocations(cacheResourceTypes, 'redis');

    expect(locations).not.toContain('East US only');
    expect(findResourceTypeLocations(cacheResourceTypes, 'redisenterprise')).toEqual([
      'Australia Central',
      'East US',
    ]);
  });

  it('resolves the target region through the display name form', () => {
    const locations = findResourceTypeLocations(cacheResourceTypes, 'redis') ?? [];

    expect(locations.some((entry) => sameRegion(entry, 'australiaeast'))).toBe(true);
  });

  it('distinguishes an absent type from a type with no locations', () => {
    expect(findResourceTypeLocations(cacheResourceTypes, 'notAType')).toBeUndefined();
    expect(findResourceTypeLocations([{ resourceType: 'Redis' }], 'redis')).toEqual([]);
  });

  it('ignores malformed entries rather than throwing', () => {
    expect(findResourceTypeLocations([null, 42, {}], 'redis')).toBeUndefined();
  });
});

describe('resolveResourceLocation', () => {
  const parameters = {
    values: { redisLocation: 'australiacentral' },
    expressions: {},
    sourcePath: 'infra/azure/main.bicepparam',
  };

  it('uses the estate region when a resource has no dedicated region parameter', () => {
    expect(resolveResourceLocation(/** @type {any} */ ({}), parameters, 'australiaeast')).toBe(
      'australiaeast',
    );
  });

  it('uses the committed resource-specific region for Managed Redis', () => {
    expect(
      resolveResourceLocation(
        /** @type {any} */ ({ locationParameterName: 'redisLocation' }),
        parameters,
        'australiaeast',
      ),
    ).toBe('australiacentral');
  });

  it('fails closed when the named region parameter is absent', () => {
    expect(
      resolveResourceLocation(
        /** @type {any} */ ({ locationParameterName: 'missingLocation' }),
        parameters,
        'australiaeast',
      ),
    ).toBeUndefined();
  });
});

describe('normaliseRuntimeList', () => {
  /**
   * Sanitized excerpt of the shape az webapp list-runtimes --os linux actually
   * returns. This is the fixture that was missing: earlier fixtures invented property
   * names and passed while the real payload read as an empty list.
   */
  const realLinuxRuntimePayload = [
    { runtime: 'Node', config: 'NODE|22-lts' },
    { runtime: 'Node', config: 'NODE|20-lts' },
    { runtime: 'Python', config: 'PYTHON|3.12' },
    { runtime: 'DotNet', config: 'DOTNETCORE|8.0' },
  ];

  it('detects the requested runtime in the real object payload', () => {
    const advertised = normaliseRuntimeList(realLinuxRuntimePayload);

    expect(advertised).toContain('NODE|22-lts');
  });

  it('reads the config field rather than the friendly runtime label', () => {
    const advertised = normaliseRuntimeList(realLinuxRuntimePayload);

    // The label is Node, which would never match a linuxFxVersion comparison.
    expect(advertised).not.toContain('Node');
    expect(advertised).toEqual([
      'NODE|22-lts',
      'NODE|20-lts',
      'PYTHON|3.12',
      'DOTNETCORE|8.0',
    ]);
  });

  it('matches the requested runtime case insensitively as the probe does', () => {
    const advertised = normaliseRuntimeList(realLinuxRuntimePayload);
    const requested = 'node|22-lts';

    expect(advertised.some((entry) => entry.toLowerCase() === requested.toLowerCase())).toBe(true);
  });

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
