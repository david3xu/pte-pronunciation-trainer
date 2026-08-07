// @vitest-environment node

/**
 * Premium text to speech contract tests.
 *
 * Written against the handler core rather than a live listener because every path
 * worth asserting depends on the synthesis result, and reaching Azure to get one
 * would make the suite need a key and a network. The core is where the contract
 * lives; server/createApp.test.ts already covers the transport.
 *
 * The properties asserted here are the ones section 9.1 of the deployment plan
 * marks as preserved rather than normalised. A future change that tidies any of
 * them fails here instead of in a learner's practice session.
 */

import { describe, expect, it, vi } from 'vitest';

import { AZURE_SPEECH_ENV_VAR, getAzureSpeechConfig, VOICE_CONFIG } from '../config.js';
import type { SynthesizeSpeechResult } from '../azureSpeech.js';
import { HEADER, HTTP_METHOD, HTTP_STATUS, type ApiRequest } from './contracts.js';
import {
  createPremiumTtsHandler,
  PREMIUM_TTS_ALLOWED_METHODS,
  PREMIUM_TTS_AUDIO_CACHE_CONTROL,
  PREMIUM_TTS_AUDIO_FORMAT,
  PREMIUM_TTS_CORS_HEADERS,
  PREMIUM_TTS_ERROR,
  PREMIUM_TTS_FIELD,
  PREMIUM_TTS_HEADER,
  PREMIUM_TTS_MAX_TEXT_LENGTH,
} from './premiumTts.js';

const AUDIO_BYTES = Buffer.from([0x49, 0x44, 0x33, 0x04]);
const AUDIO_CONTENT_TYPE = 'audio/mpeg';
const RESOLVED_VOICE_ID = 'en-AU-NatashaNeural';
const RESOLVED_LANGUAGE_CODE = 'en-AU';
const REQUESTED_VOICE_ID = 'en-GB-SoniaNeural';
const SPOKEN_TEXT = 'the quick brown fox';
const CORRELATION_ID = 'test-correlation-value';
const PROVIDER_FAILURE_MESSAGE = 'Azure Speech request failed (401)';
const BASE64_ENCODING = 'base64';

const SYNTHESIS_RESULT: SynthesizeSpeechResult = {
  audioBuffer: AUDIO_BYTES,
  contentType: AUDIO_CONTENT_TYPE,
  voiceId: RESOLVED_VOICE_ID,
  languageCode: RESOLVED_LANGUAGE_CODE,
};

/** Build a request, defaulting everything the case under test does not set. */
function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: HTTP_METHOD.post,
    path: '/api/premium-tts',
    query: {},
    headers: {},
    body: undefined,
    correlationId: CORRELATION_ID,
    ...overrides,
  };
}

/** A handler whose synthesis succeeds, plus the spies to inspect afterwards. */
function succeedingHandler() {
  const synthesize = vi.fn(async () => SYNTHESIS_RESULT);
  const log = vi.fn();
  return { handler: createPremiumTtsHandler({ synthesize, log }), synthesize, log };
}

/** A handler whose synthesis throws the given value. */
function failingHandler(thrown: unknown) {
  const synthesize = vi.fn(async () => {
    throw thrown;
  });
  const log = vi.fn();
  return { handler: createPremiumTtsHandler({ synthesize, log }), synthesize, log };
}

/**
 * The real error api/config.ts throws when Speech is unconfigured, captured
 * rather than imitated.
 *
 * A hand written copy of the message would keep passing after the real one
 * changed, which is the failure mode a leak test can least afford. The
 * environment is restored whether or not the call throws.
 */
function speechConfigurationError(): Error {
  const saved = {
    key: process.env[AZURE_SPEECH_ENV_VAR.key],
    region: process.env[AZURE_SPEECH_ENV_VAR.region],
  };
  delete process.env[AZURE_SPEECH_ENV_VAR.key];
  delete process.env[AZURE_SPEECH_ENV_VAR.region];

  let captured: unknown;
  try {
    getAzureSpeechConfig();
  } catch (error) {
    captured = error;
  } finally {
    if (saved.key !== undefined) {
      process.env[AZURE_SPEECH_ENV_VAR.key] = saved.key;
    }
    if (saved.region !== undefined) {
      process.env[AZURE_SPEECH_ENV_VAR.region] = saved.region;
    }
  }

  expect(captured).toBeInstanceOf(Error);
  return captured as Error;
}

describe('premium tts provider failure', () => {
  it('answers ok with the fallback envelope rather than a server error', async () => {
    // The single most important assertion in this file. The background audio
    // service reads a non ok status as a transport fault and retries it, so a 5xx
    // here turns a known provider outage into a retry storm.
    const { handler } = failingHandler(new Error(PROVIDER_FAILURE_MESSAGE));

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.body).toEqual({
      success: false,
      error: PREMIUM_TTS_ERROR.synthesisFailed,
      fallback: true,
    });
  });

  it('reports the same fixed message whatever the thrown value was', async () => {
    // Identical envelopes for an Error and for a bare thrown string, because the
    // message is fixed rather than derived from either.
    const fromError = await failingHandler(new Error(PROVIDER_FAILURE_MESSAGE)).handler(
      request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }),
    );
    const fromString = await failingHandler(PROVIDER_FAILURE_MESSAGE).handler(
      request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }),
    );

    expect(fromError.body).toEqual(fromString.body);
    expect(fromString.body).toMatchObject({ error: PREMIUM_TTS_ERROR.synthesisFailed });
  });

  it('logs the failure with its correlation identifier', async () => {
    // The ok status hides this failure from every status based alert, so the log is
    // the only signal that it happened.
    const { handler, log } = failingHandler(new Error(PROVIDER_FAILURE_MESSAGE));

    await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toContain(CORRELATION_ID);
    expect(log.mock.calls[0]?.[0]).toContain(PROVIDER_FAILURE_MESSAGE);
  });

  it('logs the detail it withholds from the client', async () => {
    // Two halves of one decision: the operator keeps the reason, the client does
    // not. Asserted together so removing either half fails here.
    const { handler, log } = failingHandler(new Error(PROVIDER_FAILURE_MESSAGE));

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(log.mock.calls[0]?.[0]).toContain(PROVIDER_FAILURE_MESSAGE);
    expect(JSON.stringify(response.body)).not.toContain(PROVIDER_FAILURE_MESSAGE);
  });

  it('never puts a speech environment variable name in the response', async () => {
    // Mirrors the server secret exposure test in server/createApp.test.ts, but
    // exercises this route rather than the health endpoint. The message thrown
    // when Speech is unconfigured names the missing variables, and that message
    // used to be returned verbatim.
    //
    // Note this does not reuse that test's /POSTGRES|REDIS|SPEECH/i pattern: the
    // fixed failure message legitimately contains the word speech, so the pattern
    // would fail on a correct response. The variable names are the actual secret
    // bearing strings and are what is asserted instead.
    const configurationError = speechConfigurationError();
    const { handler } = failingHandler(configurationError);

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));
    const serialised = JSON.stringify(response.body);

    // Proves the case is not vacuous: the message really does name the variable.
    expect(configurationError.message).toContain(AZURE_SPEECH_ENV_VAR.key);
    expect(serialised).not.toContain(AZURE_SPEECH_ENV_VAR.key);
    expect(serialised).not.toContain(AZURE_SPEECH_ENV_VAR.region);
  });

  it('keeps the withheld variable names in the log', async () => {
    const configurationError = speechConfigurationError();
    const { handler, log } = failingHandler(configurationError);

    await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(log.mock.calls[0]?.[0]).toContain(AZURE_SPEECH_ENV_VAR.key);
  });
});

describe('premium tts text validation', () => {
  it('refuses a missing text', async () => {
    const { handler, synthesize } = succeedingHandler();

    const response = await handler(request({ body: {} }));

    expect(response.status).toBe(HTTP_STATUS.badRequest);
    expect(response.body).toEqual({ success: false, error: PREMIUM_TTS_ERROR.textRequired });
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('refuses a whitespace only text', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: '   ' } }));

    expect(response.status).toBe(HTTP_STATUS.badRequest);
    expect(response.body).toEqual({ success: false, error: PREMIUM_TTS_ERROR.textRequired });
  });

  it('refuses an absent body without treating it as a provider failure', async () => {
    // A malformed payload arrives as undefined, because the node adapter answers a
    // JSON parse failure that way so a handler can return its own validation error.
    const { handler } = succeedingHandler();

    const response = await handler(request({ body: undefined }));

    expect(response.status).toBe(HTTP_STATUS.badRequest);
  });

  it('refuses a text that is present but not a string', async () => {
    // Deliberate divergence from the Vercel handler, which let this reach trim,
    // threw, and reported a client mistake through the provider failure envelope.
    const { handler, synthesize } = succeedingHandler();

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: 42 } }));

    expect(response.status).toBe(HTTP_STATUS.badRequest);
    expect(response.body).toEqual({ success: false, error: PREMIUM_TTS_ERROR.textRequired });
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('accepts a text at the limit and refuses one character more', async () => {
    const { handler } = succeedingHandler();
    const atLimit = 'a'.repeat(PREMIUM_TTS_MAX_TEXT_LENGTH);

    await expect(
      handler(request({ body: { [PREMIUM_TTS_FIELD.text]: atLimit } })),
    ).resolves.toMatchObject({ status: HTTP_STATUS.ok });

    const tooLong = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: `${atLimit}a` } }));

    expect(tooLong.status).toBe(HTTP_STATUS.badRequest);
    expect(tooLong.body).toEqual({ success: false, error: PREMIUM_TTS_ERROR.textTooLong });
  });

  it('measures the untrimmed length against the limit', async () => {
    // Only the emptiness check trims. A padded text at the limit is accepted on
    // Vercel and must stay accepted here.
    const { handler } = succeedingHandler();
    const padded = ` ${'a'.repeat(PREMIUM_TTS_MAX_TEXT_LENGTH)} `;

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: padded } }));

    expect(response.status).toBe(HTTP_STATUS.badRequest);
  });
});

describe('premium tts json response', () => {
  it('returns the audio base64 encoded in the success envelope', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.raw).toBeUndefined();
    expect(response.body).toEqual({
      success: true,
      data: {
        audioBase64: AUDIO_BYTES.toString(BASE64_ENCODING),
        contentType: AUDIO_CONTENT_TYPE,
        voiceId: RESOLVED_VOICE_ID,
        engine: VOICE_CONFIG.defaultEngine,
        languageCode: RESOLVED_LANGUAGE_CODE,
        requestCharacters: SPOKEN_TEXT.length,
      },
    });
  });

  it('passes the requested voice and language through to synthesis', async () => {
    const { handler, synthesize } = succeedingHandler();

    await handler(
      request({
        body: {
          [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT,
          [PREMIUM_TTS_FIELD.voiceId]: REQUESTED_VOICE_ID,
          [PREMIUM_TTS_FIELD.languageCode]: RESOLVED_LANGUAGE_CODE,
        },
      }),
    );

    expect(synthesize).toHaveBeenCalledWith({
      text: SPOKEN_TEXT,
      voiceId: REQUESTED_VOICE_ID,
      languageCode: RESOLVED_LANGUAGE_CODE,
    });
  });

  it('reports the voice synthesis resolved, not the one requested', async () => {
    // The voice table resolves aliases and unknown names to a default, and the
    // client reads the resolved value to label what it played.
    const { handler } = succeedingHandler();

    const response = await handler(
      request({
        body: {
          [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT,
          [PREMIUM_TTS_FIELD.voiceId]: REQUESTED_VOICE_ID,
        },
      }),
    );

    expect(response.body).toMatchObject({ data: { voiceId: RESOLVED_VOICE_ID } });
  });

  it('answers a get without the audio format as json', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(
      request({ method: HTTP_METHOD.get, query: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }),
    );

    expect(response.raw).toBeUndefined();
    expect(response.body).toMatchObject({ success: true });
  });

  it('ignores a query string on a post, reading only the body', async () => {
    const { handler, synthesize } = succeedingHandler();

    await handler(
      request({
        query: { [PREMIUM_TTS_FIELD.text]: 'from the query' },
        body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT },
      }),
    );

    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining({ text: SPOKEN_TEXT }));
  });
});

describe('premium tts binary audio response', () => {
  it('returns the raw buffer with its playback headers', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(
      request({
        method: HTTP_METHOD.get,
        query: {
          [PREMIUM_TTS_FIELD.format]: PREMIUM_TTS_AUDIO_FORMAT,
          [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT,
        },
      }),
    );

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.raw).toBe(AUDIO_BYTES);
    expect(response.body).toBeUndefined();
    // The node adapter sets no content type for a raw response, so the route must
    // supply it or the browser receives audio it will not decode.
    expect(response.headers?.[HEADER.contentType]).toBe(AUDIO_CONTENT_TYPE);
    expect(response.headers?.[HEADER.cacheControl]).toBe(PREMIUM_TTS_AUDIO_CACHE_CONTROL);
    expect(response.headers?.[PREMIUM_TTS_HEADER.voiceId]).toBe(RESOLVED_VOICE_ID);
    expect(response.headers?.[PREMIUM_TTS_HEADER.languageCode]).toBe(RESOLVED_LANGUAGE_CODE);
  });

  it('does not honour the audio format on a post', async () => {
    // Only the direct playback url is a get, and that url is what the format flag
    // exists to serve.
    const { handler } = succeedingHandler();

    const response = await handler(
      request({
        query: { [PREMIUM_TTS_FIELD.format]: PREMIUM_TTS_AUDIO_FORMAT },
        body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT },
      }),
    );

    expect(response.raw).toBeUndefined();
  });

  it('validates before synthesising even when audio is requested', async () => {
    const { handler, synthesize } = succeedingHandler();

    const response = await handler(
      request({
        method: HTTP_METHOD.get,
        query: { [PREMIUM_TTS_FIELD.format]: PREMIUM_TTS_AUDIO_FORMAT },
      }),
    );

    expect(response.status).toBe(HTTP_STATUS.badRequest);
    expect(synthesize).not.toHaveBeenCalled();
  });
});

describe('premium tts methods and cors', () => {
  it('short circuits the preflight to ok with an empty body', async () => {
    const { handler, synthesize } = succeedingHandler();

    const response = await handler(request({ method: HTTP_METHOD.options }));

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.raw?.byteLength).toBe(0);
    // An undefined body would serialise to the four characters null with a json
    // content type, where Vercel ended the preflight with nothing at all.
    expect(response.body).toBeUndefined();
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('rejects a method outside the table and advertises what it accepts', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(request({ method: HTTP_METHOD.head }));

    expect(response.status).toBe(HTTP_STATUS.methodNotAllowed);
    expect(response.headers?.[HEADER.allow]).toBe(PREMIUM_TTS_ALLOWED_METHODS.join(', '));
  });

  it.each([
    ['the json success', request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } })],
    ['a validation refusal', request({ body: {} })],
    ['the preflight', request({ method: HTTP_METHOD.options })],
    ['a method rejection', request({ method: HTTP_METHOD.head })],
  ])('carries cors headers on %s', async (_label, apiRequest) => {
    // The plan requires cors on every response. The method rejection is built
    // inside the shared contract, which knows nothing of this route's headers, so
    // this case is the one a per return point approach would miss.
    const { handler } = succeedingHandler();

    const response = await handler(apiRequest);

    expect(response.headers).toMatchObject(PREMIUM_TTS_CORS_HEADERS);
  });

  it('carries cors headers on the provider failure envelope', async () => {
    const { handler } = failingHandler(new Error(PROVIDER_FAILURE_MESSAGE));

    const response = await handler(request({ body: { [PREMIUM_TTS_FIELD.text]: SPOKEN_TEXT } }));

    expect(response.headers).toMatchObject(PREMIUM_TTS_CORS_HEADERS);
  });

  it('advertises exactly the methods it accepts', async () => {
    const { handler } = succeedingHandler();

    const response = await handler(request({ method: HTTP_METHOD.options }));

    expect(response.headers?.['access-control-allow-methods']).toBe(
      PREMIUM_TTS_ALLOWED_METHODS.join(', '),
    );
  });
});

