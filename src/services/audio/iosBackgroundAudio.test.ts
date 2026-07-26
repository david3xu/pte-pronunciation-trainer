import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { IOSBackgroundAudio } from './iosBackgroundAudio';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

describe('IOSBackgroundAudio', () => {
  const originalPlay = HTMLMediaElement.prototype.play;

  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
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
    document.querySelectorAll('audio').forEach((element) => element.remove());
  });

  it('does not overwrite real playback media metadata', () => {
    const iosBackgroundAudio = new IOSBackgroundAudio();

    iosBackgroundAudio.enable();

    expect(MediaMetadata).not.toHaveBeenCalled();
    expect(navigator.mediaSession.metadata).toBeNull();
  });

  it('does nothing on a native platform, since the real AVAudioSession backed plugin already owns background audio there', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const iosBackgroundAudio = new IOSBackgroundAudio();

    iosBackgroundAudio.enable();

    expect(document.querySelector('audio')).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
