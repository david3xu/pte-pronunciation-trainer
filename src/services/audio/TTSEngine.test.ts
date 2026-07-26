import { beforeEach, describe, expect, it, vi } from 'vitest';

const playTextMock = vi.fn();
const setHandlersMock = vi.fn();
const stopMock = vi.fn();

vi.mock('./backgroundAudioService', () => ({
  backgroundAudioService: {
    primeForUserGesture: vi.fn(),
    playText: playTextMock,
    setHandlers: setHandlersMock,
    stop: stopMock,
  },
}));

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('TTSEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance);
  });

  it('falls back to browser speech when generated real audio is unavailable', async () => {
    playTextMock.mockRejectedValueOnce(new Error('Premium TTS is unavailable for background audio'));

    const speakMock = vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
      utterance.onend?.();
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        cancel: vi.fn(),
        resume: vi.fn(),
        speak: speakMock,
      },
    });

    const { TTSEngine } = await import('./TTSEngine');
    const engine = new TTSEngine();

    await expect(engine.speak('hello world', 'en-US', 1.1)).resolves.toBeUndefined();

    expect(playTextMock).toHaveBeenCalledWith(
      'hello world',
      expect.objectContaining({ rate: 1.1 })
    );
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0]?.[0]).toMatchObject({
      text: 'hello world',
      lang: 'en-US',
      rate: 1.1,
    });
  });

  it('settles cleanly instead of hanging when the queue reclaims ownership mid-word (fix-tts-engine-handler-conflict)', async () => {
    type CapturedHandlers = {
      onEnded?: () => void;
      onError?: (error: Error) => void;
      onOwnershipLost?: () => void;
    };
    let capturedHandlers: CapturedHandlers | undefined;
    setHandlersMock.mockImplementation((handlers: CapturedHandlers) => {
      capturedHandlers = handlers;
    });

    // Real audio's own play never settles on its own here: this simulates
    // the queue taking the shared element back while this word's fetch/play
    // is still in flight, before playText itself would ever resolve or
    // reject.
    playTextMock.mockReturnValueOnce(new Promise<void>(() => {}));

    const { TTSEngine } = await import('./TTSEngine');
    const engine = new TTSEngine();

    const speakPromise = engine.speak('hello world', 'en-US', 1.1);

    // Let speak() reach its setHandlers() registration before the takeover.
    await Promise.resolve();
    await Promise.resolve();
    expect(capturedHandlers?.onOwnershipLost).toBeInstanceOf(Function);

    capturedHandlers?.onOwnershipLost?.();

    // Must resolve, not hang forever and not reject as though this were a
    // genuine playback failure; matches the existing "cancelled previous
    // speech" path, which also resolves with no error on supersession.
    await expect(speakPromise).resolves.toBeUndefined();
  });

  it('stop() cancels browser speech and the shared audio service without starting anything new, so a caller like PronunciationScoring can safely take the microphone', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speaking: true,
        pending: false,
        paused: false,
        getVoices: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        cancel: vi.fn(),
        resume: vi.fn(),
        speak: vi.fn(),
      },
    });

    const { TTSEngine } = await import('./TTSEngine');
    const engine = new TTSEngine();

    engine.stop();

    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(playTextMock).not.toHaveBeenCalled();
  });
});
