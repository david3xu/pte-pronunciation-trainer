import type { VoiceSelectionOptions } from './voiceSelector';

interface ConfigAccessor {
  get: (path: string) => unknown;
}

export interface BrowserSpeechServiceOptions {
  synth: SpeechSynthesis;
  getConfig: () => ConfigAccessor | null;
  getSpeechRate: () => number | null;
  getCachedVoice: () => SpeechSynthesisVoice | null;
  setCachedVoice: (voice: SpeechSynthesisVoice | null) => void;
  selectVoice: (voices: SpeechSynthesisVoice[], options?: VoiceSelectionOptions) => SpeechSynthesisVoice | null;
  showFallback: (text: string) => void;
  stopAutoPlay: () => void;
  setCurrentUtterance: (utterance: SpeechSynthesisUtterance | null) => void;
  markSpeechSettled: () => void;
}

export interface SpeakOptions {
  text: string;
  language: string;
  customRate: number | null;
  preferredVoiceName?: string | null;
}

export class BrowserSpeechService {
  private activeUtterances: SpeechSynthesisUtterance[] = [];

  constructor(private readonly options: BrowserSpeechServiceOptions) {}

  speak({ text, language, customRate, preferredVoiceName }: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.options.showFallback(text);
        resolve();
        return;
      }

      if (this.options.synth.paused) {
        console.log('[BrowserSpeechService] ▶️ Resuming paused speech synthesis');
        this.options.synth.resume();
      }

      this.startSpeech({ text, language, customRate, preferredVoiceName }, resolve);
    });
  }

  speakSimple(text: string, language: string, preferredVoiceName?: string | null): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.options.showFallback(text);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.options.getSpeechRate() || 1.0;
      utterance.volume = 1.0;

      const voices = this.options.synth.getVoices();
      const voice = this.options.selectVoice(voices, { language, preferredName: preferredVoiceName }) || voices[0];
      this.applyVoiceAndLanguage(utterance, voice || null, language);

      utterance.onend = () => resolve();
      utterance.onerror = () => {
        this.options.showFallback(text);
        resolve();
      };

      this.options.synth.speak(utterance);
    });
  }

  speakWithBackgroundAudio(
    { text, language, customRate, preferredVoiceName }: SpeakOptions,
    onEnd: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.options.showFallback(text);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const configRate = this.getNormalRate();
      utterance.rate = customRate !== null ? customRate : (this.options.getSpeechRate() || configRate);
      utterance.volume = 1.0;
      utterance.pitch = 1.0;

      if (!this.options.getCachedVoice() || this.options.synth.getVoices().length > 0) {
        const voices = this.options.synth.getVoices();
        if (voices.length > 0) {
          this.options.setCachedVoice(this.options.selectVoice(voices, { language, preferredName: preferredVoiceName }));
        }
      }

      const voice = this.options.getCachedVoice();
      this.applyVoiceAndLanguage(utterance, voice, language);

      utterance.onend = () => {
        onEnd();
        resolve();
      };

      utterance.onerror = () => resolve();

      this.options.synth.speak(utterance);
    });
  }

  private startSpeech(options: SpeakOptions, resolve: () => void): void {
    const { text, language, customRate, preferredVoiceName } = options;
    const utterance = new SpeechSynthesisUtterance(text);
    const configRate = this.getNormalRate();
    utterance.rate = customRate !== null ? customRate : (this.options.getSpeechRate() || configRate);
    utterance.volume = 1.0;
    utterance.pitch = 1.0;

    this.options.setCurrentUtterance(utterance);
    this.retainUtterance(utterance);

    const voices = this.options.synth.getVoices();
    const voice = voices.length > 0
      ? this.options.selectVoice(voices, { language, preferredName: preferredVoiceName })
      : null;

    if (voice) {
      console.log(`[BrowserSpeechService] Selected voice: ${voice.name} for lang: ${language}`);
      this.applyVoiceAndLanguage(utterance, voice, language);
      this.options.setCachedVoice(voice);
    } else if (voices.length > 0) {
      const fallbackVoice = this.options.selectVoice(voices, { language, preferredName: preferredVoiceName }) || voices[0];
      if (fallbackVoice) {
        console.warn('[BrowserSpeechService] Using fallback voice:', fallbackVoice.name);
        this.applyVoiceAndLanguage(utterance, fallbackVoice, language);
        this.options.setCachedVoice(fallbackVoice);
      } else {
        utterance.lang = this.getSafeLanguage(language);
        this.options.showFallback(text);
        resolve();
        return;
      }
    } else {
      console.warn('[BrowserSpeechService] ⚠️ No voices reported; using browser default speech voice');
      utterance.lang = this.getSafeLanguage(language);
    }

    let hasResolved = false;
    let utteranceStarted = false;
    let defaultVoiceRetryStarted = false;
    let retryTimeout: number | null = null;
    let idlePollInterval: number | null = null;
    let idlePollTimeout: number | null = null;
    let synthBecameBusy = false;
    const calculatedTimeout = Math.min(10000, Math.max(2000, (text.length / 8) * 1000 + 1000));
    const isSynthBusy = () => this.options.synth.speaking || this.options.synth.pending;
    const markSynthBusy = () => {
      synthBecameBusy = synthBecameBusy || isSynthBusy();
    };

    const clearIdleWatch = () => {
      if (idlePollInterval !== null) {
        window.clearInterval(idlePollInterval);
        idlePollInterval = null;
      }
      if (idlePollTimeout !== null) {
        window.clearTimeout(idlePollTimeout);
        idlePollTimeout = null;
      }
    };

    const safeResolve = () => {
      if (hasResolved) return;
      hasResolved = true;
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout);
      }
      clearIdleWatch();
      this.releaseUtterance(utterance);
      this.options.markSpeechSettled();
      resolve();
    };

    const resolveWhenSynthIdleOrLimit = (reason: string) => {
      if (idlePollInterval !== null || hasResolved) return;

      console.warn(`[BrowserSpeechService] ${reason}; waiting for speech synthesis to become idle`);
      idlePollInterval = window.setInterval(() => {
        markSynthBusy();
        if (!isSynthBusy()) {
          console.warn('[BrowserSpeechService] Speech synthesis became idle without events; continuing');
          safeResolve();
        }
      }, 100);

      idlePollTimeout = window.setTimeout(() => {
        console.warn('[BrowserSpeechService] Speech synthesis stayed busy without events; continuing after guard timeout');
        safeResolve();
      }, Math.min(5000, Math.max(2000, calculatedTimeout)));
    };

    const retryWithBrowserDefault = () => {
      if (hasResolved || utteranceStarted || defaultVoiceRetryStarted) return;
      if (isSynthBusy()) {
        resolveWhenSynthIdleOrLimit('Speech synthesis is active without onstart');
        return;
      }

      defaultVoiceRetryStarted = true;
      console.warn('[BrowserSpeechService] 🔁 Retrying with browser default voice');

      this.options.synth.cancel();

      const retryUtterance = new SpeechSynthesisUtterance(text);
      retryUtterance.rate = utterance.rate;
      retryUtterance.volume = 1.0;
      retryUtterance.pitch = 1.0;
      retryUtterance.lang = this.getSafeLanguage(language);

      this.options.setCurrentUtterance(retryUtterance);
      this.retainUtterance(retryUtterance);

      retryUtterance.onstart = () => {
        utteranceStarted = true;
        console.log(`[BrowserSpeechService] 🎙️ Default voice retry STARTED for: "${text.substring(0, 30)}..."`);
      };

      retryUtterance.onend = () => {
        window.clearTimeout(safetyTimeout);
        console.log(`[BrowserSpeechService] ✅ Default voice retry ENDED for: "${text.substring(0, 30)}..."`);
        this.releaseUtterance(retryUtterance);
        safeResolve();
      };

      retryUtterance.onerror = (error: SpeechSynthesisErrorEvent) => {
        window.clearTimeout(safetyTimeout);
        console.warn(`[BrowserSpeechService] ❌ Default voice retry error: ${error.error}`);
        this.releaseUtterance(retryUtterance);
        this.options.showFallback(text);
        safeResolve();
      };

      this.options.synth.resume();
      this.options.synth.speak(retryUtterance);
      markSynthBusy();

      retryTimeout = window.setTimeout(() => {
        if (hasResolved || utteranceStarted) return;
        if (isSynthBusy()) {
          resolveWhenSynthIdleOrLimit('Default voice retry appears active without onstart');
          return;
        }

        if (synthBecameBusy) {
          console.warn('[BrowserSpeechService] Default voice retry completed without events; continuing');
          safeResolve();
          return;
        }

        console.error('[BrowserSpeechService] ❌ Browser default voice retry did not start');
        this.options.synth.cancel();
        this.options.stopAutoPlay();
        this.options.showFallback(text);
        this.releaseUtterance(retryUtterance);
        safeResolve();
      }, 1200);
    };

    const safetyTimeout = window.setTimeout(() => {
      if (hasResolved) return;
      console.warn(`[BrowserSpeechService] ⏱️ Safety timeout (${calculatedTimeout}ms): "${text}"`);

      if (!utteranceStarted) {
        if (isSynthBusy()) {
          resolveWhenSynthIdleOrLimit('Speech appears active but emitted no events');
          return;
        }

        if (synthBecameBusy) {
          console.warn('[BrowserSpeechService] Speech completed without events; continuing');
          safeResolve();
          return;
        }

        if (!defaultVoiceRetryStarted) {
          retryWithBrowserDefault();
          return;
        }

        this.options.stopAutoPlay();
        this.options.showFallback(text);
      }

      safeResolve();
    }, calculatedTimeout);

    utterance.onstart = () => {
      utteranceStarted = true;
      console.log(`[BrowserSpeechService] 🎙️ Speech STARTED for: "${text.substring(0, 30)}..."`);
    };

    utterance.onend = () => {
      window.clearTimeout(safetyTimeout);
      console.log(`[BrowserSpeechService] ✅ Speech ENDED for: "${text.substring(0, 30)}..."`);
      safeResolve();
    };

    utterance.onerror = (error: SpeechSynthesisErrorEvent) => {
      if (error.error === 'interrupted' && defaultVoiceRetryStarted) {
        this.releaseUtterance(utterance);
        return;
      }

      window.clearTimeout(safetyTimeout);
      if (error.error === 'interrupted') {
        console.log(`[BrowserSpeechService] ℹ️ Speech interrupted: "${text.substring(0, 30)}..."`);
        safeResolve();
        return;
      }

      console.warn(`[BrowserSpeechService] ❌ TTS Error: ${error.error} for "${text.substring(0, 30)}..."`);
      if (error.error === 'not-allowed') {
        this.options.stopAutoPlay();
      }
      this.options.showFallback(text);
      safeResolve();
    };

    console.log(`[BrowserSpeechService] 🚀 Calling speechSynthesis.speak() for: "${text}"`);
    this.options.synth.speak(utterance);
    markSynthBusy();

    window.setTimeout(() => {
      markSynthBusy();
      if (!utteranceStarted && !hasResolved) {
        console.warn('[BrowserSpeechService] ⚠️ onstart delayed - attempting emergency resume...');
        this.options.synth.resume();
      }
    }, 800);

    window.setTimeout(() => {
      if (!hasResolved && !utteranceStarted && !isSynthBusy()) {
        if (synthBecameBusy) {
          console.warn('[BrowserSpeechService] Speech completed before start event; continuing without retry');
          safeResolve();
          return;
        }

        retryWithBrowserDefault();
      }
    }, calculatedTimeout - 200);
  }

  private retainUtterance(utterance: SpeechSynthesisUtterance): void {
    this.activeUtterances.push(utterance);
  }

  private releaseUtterance(utterance: SpeechSynthesisUtterance): void {
    const index = this.activeUtterances.indexOf(utterance);
    if (index !== -1) {
      this.activeUtterances.splice(index, 1);
    }
  }

  private getNormalRate(): number {
    const configuredRate = this.options.getConfig()?.get('tts.rate');
    return typeof configuredRate === 'number' ? configuredRate : 1.0;
  }

  private applyVoiceAndLanguage(
    utterance: SpeechSynthesisUtterance,
    voice: SpeechSynthesisVoice | null,
    requestedLanguage: string
  ): void {
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || this.getSafeLanguage(requestedLanguage);
      return;
    }

    utterance.lang = this.getSafeLanguage(requestedLanguage);
  }

  private getSafeLanguage(requestedLanguage: string): string {
    const browserLanguage = navigator.language;
    if (browserLanguage?.toLowerCase().startsWith('en')) {
      return browserLanguage;
    }

    return requestedLanguage || 'en-US';
  }
}
