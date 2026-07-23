/**
 * Minimal ambient types for the plain ESM pipeline script, so tests that
 * import it get real types instead of tsc's "implicitly has an any type"
 * error. Kept intentionally small: only the exports actually consumed
 * outside the script itself.
 */

export interface ParsedSWTItem {
  title: string;
  passage: string;
  answer: string;
  wordCount: number;
  sourceSet: string;
  difficulty: 'easy' | 'normal' | 'hard';
}

interface MinimalFsModule {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding?: string) => string;
}

export class SWTMarkdownExtractor {
  static extract(filePath: string, fsModule: MinimalFsModule, sourceSet: string): ParsedSWTItem[];
}

export class SWTAnswerTypingMarkdownExtractor {
  static extract(filePath: string, fsModule: MinimalFsModule, sourceSet: string): ParsedSWTItem[];
}

export const SWT_ANSWER_TYPING_SOURCE_FILE: string;

export class PTEDataPipeline {
  constructor(config?: Record<string, unknown>);
  run(): Promise<void>;
}

export default PTEDataPipeline;
