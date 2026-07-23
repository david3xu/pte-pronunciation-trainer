import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IOSBackgroundAudio } from './iosBackgroundAudio';

describe('IOSBackgroundAudio', () => {
  const originalPlay = HTMLMediaElement.prototype.play;

  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
    vi.stubGlobal('MediaMetadata', vi.fn());
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: vi.fn(),
      },
    });
  });

  afterEach(() => {
    HTMLMediaElement.prototype.play = originalPlay;
    vi.unstubAllGlobals();
  });

  it('does not overwrite real playback media metadata', () => {
    const iosBackgroundAudio = new IOSBackgroundAudio();

    iosBackgroundAudio.enable();

    expect(MediaMetadata).not.toHaveBeenCalled();
    expect(navigator.mediaSession.metadata).toBeNull();
  });
});
