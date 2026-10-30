/**
 * Minimal ambient types for the plain ESM pipeline script, so tests that
 * import it get real types instead of tsc's "implicitly has an any type"
 * error. Kept intentionally small: only the exports actually consumed
 * outside the script itself.
 */

export class PTEDataPipeline {
  constructor(config?: Record<string, unknown>);
  run(): Promise<void>;
}

export default PTEDataPipeline;
