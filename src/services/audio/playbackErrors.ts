/**
 * Shared predicates for classifying playback errors.
 *
 * These live outside both engines because the two playback paths have to agree
 * on what an error means, and they did not. The queue engine recognised a
 * blocked autoplay and moved to needs-user-resume so the UI could ask for a tap,
 * while TTSEngine treated the identical error as real audio being unavailable
 * and fell back to browser speech synthesis, which is gesture gated for exactly
 * the same reason and therefore could never succeed. One definition, imported by
 * both, is the only way that stays true.
 */

function readErrorFields(error: unknown): { name?: unknown; message?: unknown } | null {
  if (typeof error !== 'object' || error === null) return null;
  return error as { name?: unknown; message?: unknown };
}

/**
 * True for a cancellation, which is an expected outcome rather than a failure.
 *
 * This predicate is only safe to treat as "ignore it" while every AbortError
 * reaching it really was requested by a caller. A request that a fetch helper
 * abandoned on its own timeout is not that: nobody cancelled it, the audio is
 * genuinely unavailable, and swallowing it leaves the queue parked in
 * 'buffering' with no error, no toast and no state change. Helpers that time
 * themselves out therefore convert the resulting DOMException through
 * createPlaybackTimeoutError below, which keeps that invariant true here.
 */
export function isAbortError(error: unknown): boolean {
  const fields = readErrorFields(error);
  return fields !== null && fields.name === 'AbortError';
}

/**
 * Name carried by a request the app abandoned on its own timeout. Deliberately
 * not 'AbortError', so isAbortError above cannot classify a timeout as a
 * cancellation.
 */
export const PLAYBACK_TIMEOUT_ERROR_NAME = 'PlaybackTimeoutError';

/**
 * Rewrites a self inflicted timeout as the failure it actually is. The original
 * DOMException is kept as `cause` so logs retain it, without its name reaching
 * the predicates in this module.
 */
export function createPlaybackTimeoutError(timeoutMs: number, cause?: unknown): Error {
  const error = new Error(`Audio request timed out after ${timeoutMs}ms`, { cause });
  error.name = PLAYBACK_TIMEOUT_ERROR_NAME;
  return error;
}

/**
 * True for a request abandoned on the app's own timeout, as opposed to one a
 * caller cancelled. Such an error must reach the normal failure path.
 */
export function isPlaybackTimeoutError(error: unknown): boolean {
  const fields = readErrorFields(error);
  return fields !== null && fields.name === PLAYBACK_TIMEOUT_ERROR_NAME;
}

/**
 * Name carried by a synthesis result that cannot be played at all: no bytes, an
 * undecodable payload, or a media type the audio element will not accept.
 * Deliberately its own name, because this is neither a timeout nor a
 * cancellation nor a blocked autoplay, and the response differs from all three:
 * there is nothing to retry and no gesture that would help.
 */
export const PLAYBACK_UNPLAYABLE_AUDIO_ERROR_NAME = 'PlaybackUnplayableAudioError';

/**
 * Builds the unplayable-payload error. Without this, an empty or non-audio
 * response reaches the element and surfaces as the element's own
 * NotSupportedError, which names neither the payload nor the endpoint that
 * produced it, so a server or gateway returning a well formed envelope around
 * no audio is indistinguishable from a codec the device lacks.
 */
export function createUnplayableAudioError(reason: string, cause?: unknown): Error {
  const error = new Error(reason, { cause });
  error.name = PLAYBACK_UNPLAYABLE_AUDIO_ERROR_NAME;
  return error;
}

/**
 * True when the browser refused playback for want of a user gesture. Such an
 * error means the audio itself is fine and only the activation is missing, so
 * the correct response is to ask the user to tap rather than to try a different
 * audio source.
 */
export function isAutoplayBlockedError(error: unknown): boolean {
  const fields = readErrorFields(error);
  if (fields === null) return false;
  if (fields.name === 'NotAllowedError') return true;
  return (
    typeof fields.message === 'string' &&
    /autoplay|user gesture|not allowed/i.test(fields.message)
  );
}
