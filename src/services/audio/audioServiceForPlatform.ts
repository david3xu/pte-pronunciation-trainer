import { Capacitor } from '@capacitor/core';
import { backgroundAudioService } from './backgroundAudioService';
import { nativeAudioService } from './nativeAudioService';

/**
 * Decided once, at module load, not re-checked per call. This is the single
 * seam that determines which QueueAudioService implementation everything in
 * the app uses: AudioQueueEngine (via useAutoPlayController) and TTSEngine's
 * manual-word-tap path both construct against this, never against
 * backgroundAudioService directly on a native build. That is what keeps
 * exactly one playback owner active per platform (see
 * docs/NATIVE_MOBILE_APP_ARCHITECTURE.md section 9): on native,
 * backgroundAudioService.ensureAudioElement() (the one browser Audio()
 * element) is simply never reached, because nothing calls any
 * backgroundAudioService method at all once this selector is wired
 * everywhere backgroundAudioService used to be imported directly.
 */
export const audioServiceForPlatform = Capacitor.isNativePlatform()
  ? nativeAudioService
  : backgroundAudioService;
