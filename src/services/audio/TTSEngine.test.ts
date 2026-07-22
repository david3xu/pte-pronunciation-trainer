import { beforeEach, describe, expect, it, vi } from 'vitest';

const playTextMock = vi.fn();

vi.mock('./backgroundAudioService', () => ({
  backgroundAudioService: {
    primeForUserGesture: vi.fn(),
    playText: playTextMock,
    setHandlers: vi.fn(),
    stop: vi.fn(),
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
      expect.objectContaining({ languageCode: 'en-US', rate: 1.1 })
    );
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0]?.[0]).toMatchObject({
      text: 'hello world',
      lang: 'en-US',
      rate: 1.1,
    });
  });
});
