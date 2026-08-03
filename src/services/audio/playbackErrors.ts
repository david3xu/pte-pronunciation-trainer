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

/** True for a cancellation, which is an expected outcome rather than a failure. */
export function isAbortError(error: unknown): boolean {
  const fields = readErrorFields(error);
  return fields !== null && fields.name === 'AbortError';
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
