/**
 * Static asset and generated content serving, with SPA fallback.
 *
 * Path handling is the security sensitive part. A request path is resolved against
 * the served root and the result is checked to be inside it, so an encoded
 * traversal cannot read outside the package. The check is on the resolved path
 * rather than on the raw string, because string filtering misses encodings.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { ServerResponse } from 'node:http';

import { HEADER, HTTP_STATUS } from '../api/handlers/contracts.js';

/** The SPA entry document. */
export const INDEX_DOCUMENT = 'index.html';

/** Path prefix serving generated practice content. */
export const PROCESSED_DATA_PREFIX = '/data/processed/';

/**
 * Cache policy.
 *
 * Vite emits content hashed asset filenames, so those are immutable for a year.
 * The entry document must never be cached, or a deployment leaves clients holding
 * a document that references assets which no longer exist. Generated content sits
 * between the two: it changes only when the pipeline reruns.
 */
export const CACHE_CONTROL = {
  immutableAsset: 'public, max-age=31536000, immutable',
  entryDocument: 'no-cache',
  generatedContent: 'public, max-age=3600',
} as const;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const FALLBACK_CONTENT_TYPE = 'application/octet-stream';

/**
 * Resolve a request path inside a root directory, or undefined when the result
 * would escape it.
 */
export function resolveWithinRoot(root: string, requestPath: string): string | undefined {
  const decoded = safeDecode(requestPath);
  if (decoded === undefined) {
    return undefined;
  }

  const absoluteRoot = resolve(root);
  const candidate = resolve(join(absoluteRoot, normalize(decoded)));

  if (candidate !== absoluteRoot && !candidate.startsWith(absoluteRoot + sep)) {
    return undefined;
  }
  return candidate;
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/** Content type for a file path. */
export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] ?? FALLBACK_CONTENT_TYPE;
}

/**
 * Cache policy for a resolved file.
 *
 * The entry document is matched by name rather than by directory, because it is
 * served both at the root and as the SPA fallback for every deep link.
 */
export function cacheControlFor(filePath: string, isGeneratedContent: boolean): string {
  if (filePath.endsWith(INDEX_DOCUMENT)) {
    return CACHE_CONTROL.entryDocument;
  }
  return isGeneratedContent ? CACHE_CONTROL.generatedContent : CACHE_CONTROL.immutableAsset;
}

async function readableFile(candidate: string | undefined): Promise<string | undefined> {
  if (candidate === undefined) {
    return undefined;
  }
  try {
    const stats = await stat(candidate);
    return stats.isFile() ? candidate : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Send a file, or report that nothing was sent so the caller can fall back.
 *
 * HEAD requests receive the headers with no body, which is what the Front Door
 * health probe and several caches issue.
 */
export async function sendFile(
  response: ServerResponse,
  filePath: string,
  options: { readonly isGeneratedContent: boolean; readonly bodyless: boolean },
): Promise<void> {
  const stats = await stat(filePath);

  response.writeHead(HTTP_STATUS.ok, {
    [HEADER.contentType]: contentTypeFor(filePath),
    [HEADER.contentLength]: String(stats.size),
    [HEADER.cacheControl]: cacheControlFor(filePath, options.isGeneratedContent),
  });

  if (options.bodyless) {
    response.end();
    return;
  }

  await new Promise<void>((settle, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', () => settle());
    stream.pipe(response);
  });
}

export interface StaticResolution {
  readonly filePath: string;
  readonly isGeneratedContent: boolean;
}

/**
 * Resolve a request path to a file on disk.
 *
 * Order matters. Generated content is checked first because it lives outside the
 * build output, then the build output, then the SPA fallback. The fallback is only
 * offered for paths that could be a client route: a request for a missing asset
 * with a file extension returns not found rather than the entry document, because
 * answering a missing script with HTML produces a parse error instead of a 404.
 */
export async function resolveStaticRequest(
  requestPath: string,
  roots: { readonly distDirectory: string; readonly processedDataDirectory: string },
): Promise<StaticResolution | undefined> {
  if (requestPath.startsWith(PROCESSED_DATA_PREFIX)) {
    const relative = requestPath.slice(PROCESSED_DATA_PREFIX.length);
    const generated = await readableFile(
      resolveWithinRoot(roots.processedDataDirectory, relative),
    );
    return generated === undefined
      ? undefined
      : { filePath: generated, isGeneratedContent: true };
  }

  const direct = await readableFile(resolveWithinRoot(roots.distDirectory, requestPath));
  if (direct !== undefined) {
    return { filePath: direct, isGeneratedContent: false };
  }

  if (extname(requestPath) !== '') {
    return undefined;
  }

  const fallback = await readableFile(
    resolveWithinRoot(roots.distDirectory, INDEX_DOCUMENT),
  );
  return fallback === undefined ? undefined : { filePath: fallback, isGeneratedContent: false };
}
