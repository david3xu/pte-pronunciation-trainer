/**
 * Premium text to speech handler core.
 *
 * Ported from the Vercel entry point without normalising its contract. Three
 * properties look like defects and are not, so they are stated here rather than
 * left for a later reader to correct:
 *
 * 1. A synthesis failure answers HTTP 200 carrying `success: false` and
 *    `fallback: true`. The background audio service treats a non ok status as a
 *    transport fault worth retrying and this envelope as a definite provider
 *    failure, and it has a test asserting exactly that. A 5xx here would turn a
 *    known unavailability into a retry storm.
 * 2. CORS headers are present on every response, including the method rejection
 *    and the preflight. They are declared in this module rather than in the
 *    shared contract because the deployment plan records that the remaining
 *    handlers each need a different CORS surface. Lifting them belongs in the
 *    change that ports the second one, when what actually varies is visible
 *    rather than guessed.
 * 3. The response reports the request length untrimmed, and the length check
 *    reads the untrimmed value too. Only the emptiness check trims.
 *
 * Two deliberate divergences from the Vercel handler, both narrowing what reaches
 * a client rather than changing what a working request returns:
 *
 * 1. A `text` field that is present but not a string is answered as a bad request
 *    rather than reaching the synthesis path. Vercel let it through, where calling
 *    `trim` on a number threw and surfaced as the provider failure envelope, which
 *    reports a client mistake as an outage. The contract matrix assigns 400 to a
 *    missing or oversized text, and a non string text is a missing one.
 * 2. The failure envelope carries a fixed message, where Vercel returned the
 *    thrown one. `normaliseError` in the shared contract exists because a thrown
 *    message can carry a key or a path, and the message thrown when Speech is
 *    unconfigured names the missing environment variables. The client reads
 *    `fallback` to decide what to do and never the reason, so the reason belongs
 *    in the log alone.
 */

import { VOICE_CONFIG } from '../config.js';
import {
  synthesizeSpeech,
  type SynthesizeSpeechOptions,
  type SynthesizeSpeechResult,
} from '../azureSpeech.js';
import {
  fail,
  HEADER,
  HTTP_METHOD,
  HTTP_STATUS,
  ok,
  withMethods,
  type ApiHandler,
  type ApiRequest,
  type ApiResponse,
} from './contracts.js';

/** Methods this route accepts. */
export const PREMIUM_TTS_ALLOWED_METHODS = [
  HTTP_METHOD.get,
  HTTP_METHOD.post,
  HTTP_METHOD.options,
] as const;

/**
 * Field names, read from the query string on GET and from the JSON body on POST.
 * One table serves both because the names are identical on either transport.
 *
 * The client also sends `engine` and `outputFormat` on POST. Both are ignored
 * here, as they were on Vercel: the engine is implied by the neural voice table
 * and the output format is fixed inside the synthesis call.
 */
export const PREMIUM_TTS_FIELD = {
  text: 'text',
  voiceId: 'voiceId',
  languageCode: 'languageCode',
  format: 'format',
} as const;

/** Value of `format` that selects the binary response instead of JSON. */
export const PREMIUM_TTS_AUDIO_FORMAT = 'audio';

/** Longest accepted text. Beyond this the request is refused, not truncated. */
export const PREMIUM_TTS_MAX_TEXT_LENGTH = 3000;

/**
 * Cache directive for the binary response. Private because the audio is keyed to
 * one learner's text, and a day because the same prompt is replayed repeatedly
 * across a practice session.
 */
export const PREMIUM_TTS_AUDIO_CACHE_CONTROL = 'private, max-age=86400';

/** Response headers unique to this route. */
export const PREMIUM_TTS_HEADER = {
  voiceId: 'x-voice-id',
  languageCode: 'x-language-code',
} as const;

/** CORS header names this route sets. */
const CORS_HEADER = {
  allowOrigin: 'access-control-allow-origin',
  allowMethods: 'access-control-allow-methods',
  allowHeaders: 'access-control-allow-headers',
} as const;

/** Any origin, matching the Vercel handler. The route reads no credential. */
const CORS_ANY_ORIGIN = '*';

/** Separator for the multi value CORS and Allow header lists. */
const HEADER_LIST_SEPARATOR = ', ';

/**
 * CORS headers applied to every response.
 *
 * The advertised method list is derived from this route's own method table so the
 * two cannot disagree, and the advertised request header is derived from the
 * shared header name. That name is lowercase where the Vercel handler sent it
 * title cased; CORS header matching is case insensitive, so this is a spelling
 * change and not a behavioural one.
 */
export const PREMIUM_TTS_CORS_HEADERS: Readonly<Record<string, string>> = {
  [CORS_HEADER.allowOrigin]: CORS_ANY_ORIGIN,
  [CORS_HEADER.allowMethods]: PREMIUM_TTS_ALLOWED_METHODS.join(HEADER_LIST_SEPARATOR),
  [CORS_HEADER.allowHeaders]: HEADER.contentType,
};

/** Client facing messages. The length limit is interpolated, never repeated. */
export const PREMIUM_TTS_ERROR = {
  textRequired: 'Text is required',
  textTooLong: `Text too long (max ${PREMIUM_TTS_MAX_TEXT_LENGTH} characters)`,
  synthesisFailed: 'Failed to synthesize speech',
} as const;

/** Encoding used to carry audio inside the JSON response. */
const AUDIO_TEXT_ENCODING = 'base64';

/**
 * Preflight body. Vercel ended the response without one, and an empty buffer
 * reproduces that: zero content length and no JSON content type, where an
 * undefined body would serialise to the four characters null.
 */
const EMPTY_BODY = Buffer.alloc(0);

/** Payload of the JSON success response. */
export interface PremiumTtsAudioPayload {
  readonly audioBase64: string;
  readonly contentType: string;
  readonly voiceId: string;
  readonly engine: string;
  readonly languageCode: string;
  readonly requestCharacters: number;
}

/**
 * Provider failure envelope. Distinct from the shared error envelope because of
 * the `fallback` discriminator, which is what the client reads to tell a definite
 * provider failure from a transport fault worth retrying.
 */
export interface PremiumTtsFallbackEnvelope {
  readonly success: false;
  readonly error: string;
  readonly fallback: true;
}

/** Collaborators, injected so the route is testable without reaching Azure. */
export interface PremiumTtsDependencies {
  readonly synthesize: (options: SynthesizeSpeechOptions) => Promise<SynthesizeSpeechResult>;
  readonly log: (message: string) => void;
}

/** Narrow an unknown parsed body to something with readable fields. */
function asFieldSource(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Read one field, discarding a value that is present but not a string. */
function readString(source: Readonly<Record<string, unknown>>, field: string): string | undefined {
  const value = source[field];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Merge this route's CORS headers into a response.
 *
 * Wrapping rather than adding them at each return point is what makes the
 * guarantee total. The method rejection is built by `withMethods` inside the
 * shared contract, which knows nothing about this route's headers, so a response
 * that never passes through the core still carries them. Route specific headers
 * are applied second and therefore win, which matters only if the two tables ever
 * overlap.
 */
function withCors(handler: ApiHandler): ApiHandler {
  return async (request) => {
    const result = await handler(request);
    return {
      ...result,
      headers: { ...PREMIUM_TTS_CORS_HEADERS, ...(result.headers ?? {}) },
    };
  };
}

/** Whether this request wants the raw MP3 rather than the JSON envelope. */
function wantsBinaryAudio(request: ApiRequest): boolean {
  return (
    request.method === HTTP_METHOD.get &&
    request.query[PREMIUM_TTS_FIELD.format] === PREMIUM_TTS_AUDIO_FORMAT
  );
}

/**
 * Build the route, given its collaborators.
 */
export function createPremiumTtsHandler(dependencies: PremiumTtsDependencies): ApiHandler {
  const core: ApiHandler = async (request): Promise<ApiResponse> => {
    if (request.method === HTTP_METHOD.options) {
      return { status: HTTP_STATUS.ok, raw: EMPTY_BODY };
    }

    const source = request.method === HTTP_METHOD.get ? request.query : asFieldSource(request.body);
    const text = readString(source, PREMIUM_TTS_FIELD.text);
    const voiceId = readString(source, PREMIUM_TTS_FIELD.voiceId);
    const languageCode = readString(source, PREMIUM_TTS_FIELD.languageCode);

    if (text === undefined || text.trim() === '') {
      return fail(HTTP_STATUS.badRequest, PREMIUM_TTS_ERROR.textRequired);
    }

    if (text.length > PREMIUM_TTS_MAX_TEXT_LENGTH) {
      return fail(HTTP_STATUS.badRequest, PREMIUM_TTS_ERROR.textTooLong);
    }

    try {
      const result = await dependencies.synthesize({ text, voiceId, languageCode });

      if (wantsBinaryAudio(request)) {
        return {
          status: HTTP_STATUS.ok,
          headers: {
            [HEADER.contentType]: result.contentType,
            [HEADER.cacheControl]: PREMIUM_TTS_AUDIO_CACHE_CONTROL,
            [PREMIUM_TTS_HEADER.voiceId]: result.voiceId,
            [PREMIUM_TTS_HEADER.languageCode]: result.languageCode,
          },
          raw: result.audioBuffer,
        };
      }

      return ok<PremiumTtsAudioPayload>({
        audioBase64: result.audioBuffer.toString(AUDIO_TEXT_ENCODING),
        contentType: result.contentType,
        voiceId: result.voiceId,
        // Every entry in the premium voice table is a neural voice, so the
        // reported engine is the configured default rather than a bare literal at
        // the one place that answers with it.
        engine: VOICE_CONFIG.defaultEngine,
        languageCode: result.languageCode,
        requestCharacters: text.length,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : undefined;

      // Logged with the correlation identifier because the ok status hides this
      // failure from every status based alert. The log is the only signal.
      dependencies.log(
        `request ${request.correlationId} premium tts synthesis failed: ${detail ?? String(error)}`,
      );

      return {
        status: HTTP_STATUS.ok,
        body: {
          success: false,
          // Fixed, never the thrown message. A synthesis failure can throw the
          // configuration error naming AZURE_SPEECH_KEY, or a provider body
          // carrying a request identifier, and neither belongs in a response.
          // The client acts on `fallback`, not on the reason, so the reason stays
          // in the log where the correlation identifier can retrieve it.
          error: PREMIUM_TTS_ERROR.synthesisFailed,
          fallback: true,
        } satisfies PremiumTtsFallbackEnvelope,
      };
    }
  };

  return withCors(withMethods(PREMIUM_TTS_ALLOWED_METHODS, core));
}

/** The route as both hosts bind it. */
export const premiumTtsHandler: ApiHandler = createPremiumTtsHandler({
  synthesize: synthesizeSpeech,
  log: console.error,
});

