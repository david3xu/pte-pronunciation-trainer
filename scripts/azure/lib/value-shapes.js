/**
 * Validators for the deployment specific values supplied through the AZD
 * environment.
 *
 * Every validator returns a reason on failure rather than a boolean, because the
 * environment gate is required to fail with a message an operator can act on
 * without reading the script.
 */

import { VALUE_SHAPE } from '../deployment-contract.js';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AZURE_REGION_PATTERN = /^[a-z][a-z0-9]{2,}$/;
const AZURE_RESOURCE_ID_PATTERN = /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/[^/]+\/.+$/i;
const HTTPS_SCHEME = 'https:';
const ORIGIN_SEPARATOR = ',';

/**
 * @typedef {{ valid: true } | { valid: false, reason: string }} ShapeResult
 */

const VALID = Object.freeze({ valid: true });

/**
 * @param {string} reason
 * @returns {ShapeResult}
 */
function invalid(reason) {
  return { valid: false, reason };
}

/**
 * A pragmatic mailbox check. The intent is to reject an obviously unusable value
 * such as an empty string or a bare word, not to re implement the mail
 * addressing specification.
 *
 * @param {string} value
 * @returns {ShapeResult}
 */
function validateEmail(value) {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) {
    return invalid('expected a single mailbox address containing one at sign');
  }
  const domain = value.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return invalid('expected the mailbox domain to contain a dot and not begin or end with one');
  }
  if (/\s/.test(value)) {
    return invalid('expected a mailbox address without whitespace');
  }
  return VALID;
}

/**
 * @param {string} value
 * @returns {ShapeResult}
 */
function validateHttpsUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return invalid('expected an absolute URL');
  }
  if (parsed.protocol !== HTTPS_SCHEME) {
    return invalid(`expected the https scheme, found ${parsed.protocol}`);
  }
  return VALID;
}

/**
 * Validate a comma separated origin list. Native clients present a scheme other
 * than https, so an origin is accepted when it parses as an absolute URL with no
 * path, query or fragment. A trailing slash is rejected because API Management
 * and App Service both compare origins literally.
 *
 * @param {string} value
 * @returns {ShapeResult}
 */
function validateOriginList(value) {
  const entries = splitOriginList(value);
  if (entries.length === 0) {
    return invalid('expected at least one origin');
  }

  for (const entry of entries) {
    let parsed;
    try {
      parsed = new URL(entry);
    } catch {
      return invalid(`origin ${entry} is not an absolute URL`);
    }
    if (parsed.search !== '' || parsed.hash !== '') {
      return invalid(`origin ${entry} must not carry a query or fragment`);
    }
    if (parsed.pathname !== '' && parsed.pathname !== '/') {
      return invalid(`origin ${entry} must not carry a path`);
    }
    if (entry.endsWith('/')) {
      return invalid(`origin ${entry} must not end with a slash`);
    }
  }

  const unique = new Set(entries);
  if (unique.size !== entries.length) {
    return invalid('origin list contains a duplicate entry');
  }

  return VALID;
}

/**
 * Split an origin list into trimmed entries, dropping empty segments.
 *
 * @param {string} value
 * @returns {string[]}
 */
export function splitOriginList(value) {
  return value
    .split(ORIGIN_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/** @type {Record<string, (value: string) => ShapeResult>} */
const VALIDATORS = {
  [VALUE_SHAPE.guid]: (value) =>
    GUID_PATTERN.test(value) ? VALID : invalid('expected a GUID in the canonical hyphenated form'),
  [VALUE_SHAPE.email]: validateEmail,
  [VALUE_SHAPE.nonEmptyText]: (value) =>
    value.trim() === '' ? invalid('expected a non empty value') : VALID,
  [VALUE_SHAPE.httpsUrl]: validateHttpsUrl,
  [VALUE_SHAPE.originList]: validateOriginList,
  [VALUE_SHAPE.azureResourceId]: (value) =>
    AZURE_RESOURCE_ID_PATTERN.test(value)
      ? VALID
      : invalid('expected a full ARM resource identifier beginning with /subscriptions/'),
  [VALUE_SHAPE.azureRegion]: (value) =>
    AZURE_REGION_PATTERN.test(value)
      ? VALID
      : invalid('expected a lowercase region short name such as the one recorded in the deployment plan'),
};

/**
 * Validate a value against a named shape.
 *
 * @param {string} shape
 * @param {string | undefined} value
 * @returns {ShapeResult}
 */
export function validateShape(shape, value) {
  if (value === undefined) {
    return invalid('value is not set');
  }
  const validator = VALIDATORS[shape];
  if (validator === undefined) {
    return invalid(`no validator is defined for shape ${shape}`);
  }
  if (value.trim() === '') {
    return invalid('value is set but empty');
  }
  return validator(value.trim());
}
