/**
 * Minimal reader for the committed Bicep parameter file.
 *
 * The capacity checks must probe the tiers that will actually be deployed. Rather
 * than restating SKU names inside the automation, which would create a second
 * source of truth that can silently drift from infra/azure/main.bicepparam, the
 * automation reads the parameter file and validates what it finds there.
 *
 * The supported value grammar is deliberately narrow: quoted strings, integers,
 * booleans, and flat arrays of those. Anything else is returned as a raw
 * expression string so a caller can report it rather than guess at its meaning.
 */

import { readFile } from 'node:fs/promises';

import { REPO_PATHS, toRepoRelative } from './paths.js';

const PARAM_KEYWORD = 'param';
const LINE_COMMENT_MARKER = '//';
const OPENING_BRACKETS = new Set(['[', '{', '(']);
const CLOSING_BRACKETS = new Set([']', '}', ')']);

/** Marker returned for a value this reader intentionally does not interpret. */
export const UNPARSED_EXPRESSION = Symbol('unparsedBicepExpression');

/**
 * @typedef {object} BicepParameterFile
 * @property {Record<string, unknown>} values Parameter name to interpreted value.
 * @property {Record<string, string>} expressions Parameter name to raw source text.
 * @property {string} sourcePath Repository relative path that was read.
 */

/**
 * Remove line comments that sit outside string literals.
 *
 * @param {string} source
 * @returns {string}
 */
function stripLineComments(source) {
  const output = [];
  let insideString = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === "'" && source[index - 1] !== '\\') {
      insideString = !insideString;
    }

    if (
      !insideString &&
      character === LINE_COMMENT_MARKER[0] &&
      source[index + 1] === LINE_COMMENT_MARKER[1]
    ) {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      output.push('\n');
      continue;
    }

    output.push(character);
  }

  return output.join('');
}

/**
 * Split a bracketed list body on commas and newlines that sit at nesting depth
 * zero, so nested arrays survive intact.
 *
 * @param {string} body
 * @returns {string[]}
 */
function splitTopLevelItems(body) {
  const items = [];
  let current = '';
  let depth = 0;
  let insideString = false;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if (character === "'" && body[index - 1] !== '\\') {
      insideString = !insideString;
    }

    if (!insideString && OPENING_BRACKETS.has(character)) {
      depth += 1;
    }
    if (!insideString && CLOSING_BRACKETS.has(character)) {
      depth -= 1;
    }

    const isSeparator = !insideString && depth === 0 && (character === ',' || character === '\n');
    if (isSeparator) {
      if (current.trim() !== '') {
        items.push(current.trim());
      }
      current = '';
      continue;
    }

    current += character;
  }

  if (current.trim() !== '') {
    items.push(current.trim());
  }

  return items;
}

/**
 * Interpret a single Bicep value expression.
 *
 * @param {string} expression
 * @returns {unknown}
 */
function interpretValue(expression) {
  const trimmed = expression.trim();

  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed === 'true';
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return splitTopLevelItems(trimmed.slice(1, -1)).map(interpretValue);
  }

  return UNPARSED_EXPRESSION;
}

/**
 * Read the value expression that begins at the given offset, consuming a
 * balanced bracket group when the value opens one and otherwise stopping at the
 * end of the line.
 *
 * @param {string} source
 * @param {number} startIndex
 * @returns {{ expression: string, endIndex: number }}
 */
function readValueExpression(source, startIndex) {
  let index = startIndex;
  let depth = 0;
  let insideString = false;
  let sawContent = false;
  let expression = '';

  while (index < source.length) {
    const character = source[index];

    if (character === "'" && source[index - 1] !== '\\') {
      insideString = !insideString;
    }

    if (!insideString) {
      if (OPENING_BRACKETS.has(character)) {
        depth += 1;
      } else if (CLOSING_BRACKETS.has(character)) {
        depth -= 1;
      } else if (character === '\n' && depth === 0 && sawContent) {
        break;
      }
    }

    if (character.trim() !== '') {
      sawContent = true;
    }

    expression += character;
    index += 1;

    if (sawContent && depth === 0 && !insideString && CLOSING_BRACKETS.has(character)) {
      break;
    }
  }

  return { expression: expression.trim(), endIndex: index };
}

/**
 * Parse the parameter file source text.
 *
 * @param {string} source
 * @param {string} sourcePath
 * @returns {BicepParameterFile}
 */
export function parseBicepParameters(source, sourcePath) {
  const cleaned = stripLineComments(source);
  /** @type {Record<string, unknown>} */
  const values = {};
  /** @type {Record<string, string>} */
  const expressions = {};

  const declaration = new RegExp(`(^|\\n)\\s*${PARAM_KEYWORD}\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=`, 'g');
  let match = declaration.exec(cleaned);

  while (match !== null) {
    const name = match[2];
    const { expression, endIndex } = readValueExpression(cleaned, match.index + match[0].length);
    expressions[name] = expression;
    values[name] = interpretValue(expression);
    declaration.lastIndex = endIndex;
    match = declaration.exec(cleaned);
  }

  return { values, expressions, sourcePath };
}

/**
 * Load and parse infra/azure/main.bicepparam.
 *
 * @returns {Promise<BicepParameterFile>}
 */
export async function loadBicepParameters() {
  const source = await readFile(REPO_PATHS.bicepParameters, 'utf8');
  return parseBicepParameters(source, toRepoRelative(REPO_PATHS.bicepParameters));
}

/**
 * Parameter names whose committed value is a deployment blocking empty value.
 * An empty string or an empty array in a committed parameter file means the
 * deployment would either fail or silently create something unintended.
 *
 * @param {BicepParameterFile} parsed
 * @param {string[]} requiredNames
 * @returns {string[]}
 */
export function findBlankRequiredParameters(parsed, requiredNames) {
  return requiredNames.filter((name) => {
    const value = parsed.values[name];
    if (value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  });
}
