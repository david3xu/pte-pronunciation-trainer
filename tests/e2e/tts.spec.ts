import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/premium-tts', (route) => {
    throw new Error(`Premium TTS endpoint should not be called: ${route.request().url()}`);
  });

  await page.addInitScript(() => {
    type TtsEvent = {
      type: string;
      text?: string;
      lang?: string;
      voice?: string | null;
      rate?: number;
    };

    const events: TtsEvent[] = [];
    const listeners = new Map<string, Set<() => void>>();
    const voices = [
      { name: 'Google UK English Male', lang: 'en-GB', localService: true, default: true },
      { name: 'Google US English', lang: 'en-US', localService: true, default: false },
    ];

    class MockSpeechSynthesisUtterance extends EventTarget {
      text: string;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      volume = 1;
      pitch = 1;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(text = '') {
        super();
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => voices,
        addEventListener: (type: string, listener: () => void) => {
          const typeListeners = listeners.get(type) ?? new Set<() => void>();
          typeListeners.add(listener);
          listeners.set(type, typeListeners);
          if (type === 'voiceschanged') {
            window.setTimeout(listener, 0);
          }
        },
        removeEventListener: (type: string, listener: () => void) => {
          listeners.get(type)?.delete(listener);
        },
        cancel() {
          this.speaking = false;
          this.pending = false;
          events.push({ type: 'cancel' });
        },
        resume() {
          this.paused = false;
          events.push({ type: 'resume' });
        },
        speak(utterance: SpeechSynthesisUtterance) {
          this.speaking = true;
          this.pending = false;
          events.push({
            type: 'speak',
            text: utterance.text,
            lang: utterance.lang,
            voice: utterance.voice?.name ?? null,
            rate: utterance.rate,
          });
          window.setTimeout(() => {
            utterance.onstart?.(new Event('start'));
            window.setTimeout(() => {
              this.speaking = false;
              utterance.onend?.(new Event('end'));
            }, 0);
          }, 0);
        },
      },
    });

    Object.defineProperty(window, '__ttsEvents', {
      configurable: true,
      value: events,
    });
  });
});

test('clicking vocabulary audio invokes browser speech synthesis', async ({ page }) => {
  await page.goto('/');

  const wordCard = page.locator('.word-card');
  await expect(wordCard).toBeVisible();

  const audioButton = wordCard.getByRole('button').first();
  await expect(audioButton).toBeEnabled();
  await audioButton.click();

  await expect.poll(async () => page.evaluate(() => {
    const events = (window as unknown as { __ttsEvents: Array<{ type: string; text?: string }> }).__ttsEvents;
    return events.some((event) => event.type === 'speak' && Boolean(event.text));
  })).toBe(true);

  const speakEvent = await page.evaluate(() => {
    const events = (window as unknown as { __ttsEvents: Array<{
      type: string;
      text?: string;
      lang?: string;
      voice?: string | null;
      rate?: number;
    }> }).__ttsEvents;
    return events.find((event) => event.type === 'speak');
  });

  expect(speakEvent).toMatchObject({
    type: 'speak',
    lang: 'en-GB',
    voice: 'Google UK English Male',
    rate: 1.2,
  });
});
