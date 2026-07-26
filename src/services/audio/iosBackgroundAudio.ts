import { Capacitor } from '@capacitor/core';

type BackgroundSyncRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class IOSBackgroundAudio {
  private enabled = false;
  private audioContext?: AudioContext;
  private backgroundAudioElement?: HTMLAudioElement;

  enable(): void {
    // Native builds already have a real AVAudioSession backed background
    // audio path (see nativeAudioService.ts and
    // ios/App/App/BackgroundAudioPlugin.swift). This web only PWA keep
    // alive technique must never run there: it would create a second,
    // uncoordinated HTMLAudioElement looping at an audible, not muted,
    // volume, against the single playback owner invariant the rest of
    // this codebase's audio work enforces (see
    // docs/NATIVE_MOBILE_APP_ARCHITECTURE.md section 9).
    if (Capacitor.isNativePlatform()) {
      return;
    }

    if (!this.enabled) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          const backgroundSyncRegistration = registration as BackgroundSyncRegistration;
          if (backgroundSyncRegistration.sync) {
            void backgroundSyncRegistration.sync.register('audio-playback');
          }
        });
      }
      this.enabled = true;
    }

    const AudioContextClass =
      window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;

    if (AudioContextClass) {
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }
    }

    this.setup();
  }

  start(): void {
    if (!this.backgroundAudioElement) return;

    const playPromise = this.backgroundAudioElement.play();
    if (playPromise === undefined) return;

    playPromise
      .then(() => {
        console.log('[IOSBackgroundAudio] ✅ Background audio started successfully');
      })
      .catch((error: Error) => {
        console.warn('[IOSBackgroundAudio] ⚠️ Background audio failed to start:', error.message);

        const retryPlay = () => {
          this.backgroundAudioElement!.play()
            .then(() => {
              console.log('[IOSBackgroundAudio] ✅ Background audio started on retry');
              document.removeEventListener('click', retryPlay);
              document.removeEventListener('touchstart', retryPlay);
            })
            .catch(() => {
              // The retry is best-effort; foreground TTS still works without it.
            });
        };

        document.addEventListener('click', retryPlay, { once: true });
        document.addEventListener('touchstart', retryPlay, { once: true });
      });
  }

  private setup(): void {
    if (!this.backgroundAudioElement) {
      this.backgroundAudioElement = document.createElement('audio');
      this.backgroundAudioElement.loop = true;
      this.backgroundAudioElement.volume = 0.05;
      this.backgroundAudioElement.preload = 'auto';
      this.backgroundAudioElement.muted = false;
      this.backgroundAudioElement.autoplay = false;
      this.backgroundAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      this.backgroundAudioElement.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
      this.backgroundAudioElement.setAttribute('playsinline', '');
      this.backgroundAudioElement.setAttribute('webkit-playsinline', '');

      if (document.body) {
        document.body.appendChild(this.backgroundAudioElement);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (this.backgroundAudioElement) {
            document.body.appendChild(this.backgroundAudioElement);
            this.start();
          }
        });
        return;
      }
    }

    this.start();

    // This silent iOS priming element must not publish lock-screen metadata.
    // Real vocabulary playback owns Media Session rows so the lock screen can
    // show only the word and its British sounds-like hint.
  }
}
