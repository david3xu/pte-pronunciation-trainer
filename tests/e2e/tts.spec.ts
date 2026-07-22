import { expect, type Page, test } from '@playwright/test';

interface PremiumTtsRequest {
  method: string;
  url: string;
  postData: string | null;
}

type AudioEventLog = {
  type: string;
  src?: string;
  playbackRate?: number;
  volume?: number;
};

const setupRealAudioMocks = async (page: Page): Promise<{ requests: PremiumTtsRequest[] }> => {
  const requests: PremiumTtsRequest[] = [];

  await page.route('**/api/premium-tts**', async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      postData: request.postData(),
    });

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('mock-mp3-audio'),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-Voice-Id': 'en-AU-WilliamNeural',
          'X-Language-Code': 'en-AU',
        },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          audioBase64: Buffer.from('mock-mp3-audio').toString('base64'),
          contentType: 'audio/mpeg',
          voiceId: 'en-AU-WilliamNeural',
          engine: 'neural',
          languageCode: 'en-AU',
          requestCharacters: 12,
        },
      }),
    });
  });

  await page.addInitScript(() => {
    type AudioEventLog = {
      type: string;
      src?: string;
      playbackRate?: number;
      volume?: number;
    };

    const events: AudioEventLog[] = [];

    class MockAudio {
      src = '';
      preload = '';
      paused = true;
      ended = false;
      loop = false;
      muted = false;
      playbackRate = 1;
      volume = 1;
      private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

      play(): Promise<void> {
        this.paused = false;
        this.ended = false;
        events.push({
          type: 'play',
          src: this.src,
          playbackRate: this.playbackRate,
          volume: this.volume,
        });

        const delay = (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs ?? 80;
        window.setTimeout(() => {
          if (this.paused || this.loop) return;
          this.ended = true;
          this.paused = true;
          events.push({ type: 'ended', src: this.src });
          this.dispatch('ended');
        }, delay);

        return Promise.resolve();
      }

      pause(): void {
        this.paused = true;
        events.push({ type: 'pause', src: this.src });
      }

      load(): void {
        events.push({ type: 'load', src: this.src });
      }

      setAttribute(name: string, value: string): void {
        if (name === 'src') this.src = value;
      }

      removeAttribute(name: string): void {
        if (name === 'src') this.src = '';
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.listeners.get(type)?.delete(listener);
      }

      private dispatch(type: string): void {
        const event = new Event(type);
        for (const listener of this.listeners.get(type) ?? []) {
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else {
            listener.handleEvent(event);
          }
        }
      }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: MockAudio,
    });

    Object.defineProperty(window, '__audioEvents', {
      configurable: true,
      value: events,
    });
  });

  return { requests };
};

const getAudioEvents = (page: Page): Promise<AudioEventLog[]> => page.evaluate(() => (
  (window as unknown as { __audioEvents: AudioEventLog[] }).__audioEvents
));

const findAudioEvent = async (
  page: Page,
  predicate: (event: AudioEventLog) => boolean
): Promise<AudioEventLog | undefined> => {
  const events = await getAudioEvents(page);
  return events.find(predicate);
};

test('clicking vocabulary audio uses real premium TTS at the default 1.0x speed', async ({ page }) => {
  const { requests } = await setupRealAudioMocks(page);
  await page.goto('/');

  const wordCard = page.locator('.word-card');
  await expect(wordCard).toBeVisible();

  const audioButton = wordCard.getByRole('button').first();
  await expect(audioButton).toBeEnabled();
  await audioButton.click();

  await expect.poll(() => requests.filter((request) => request.method === 'POST').length).toBeGreaterThanOrEqual(1);

  await expect.poll(async () => {
    const event = await findAudioEvent(page, (audioEvent) => (
      audioEvent.type === 'play' && !!audioEvent.src?.startsWith('blob:')
    ));
    return Boolean(event);
  }).toBe(true);

  const playEvent = await findAudioEvent(page, (audioEvent) => (
    audioEvent.type === 'play' && !!audioEvent.src?.startsWith('blob:')
  ));

  expect(playEvent).toMatchObject({
    type: 'play',
    playbackRate: 1.0,
    volume: 1,
  });

  const requestBody = JSON.parse(requests.find((request) => request.method === 'POST')?.postData || '{}') as {
    voiceId?: string;
    languageCode?: string;
  };
  expect(requestBody).toMatchObject({
    voiceId: 'en-AU-WilliamNeural',
    languageCode: 'en-AU',
  });
});

test('autoplay Play starts the real MP3 URL from the tap and advances to the next item', async ({ page }) => {
  await setupRealAudioMocks(page);
  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  await expect(audioControls).toBeVisible();

  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  await expect.poll(async () => {
    const event = await findAudioEvent(page, (audioEvent) => (
      audioEvent.type === 'play' && !!audioEvent.src?.includes('/api/premium-tts?format=audio')
    ));
    return Boolean(event);
  }).toBe(true);

  const directPlayEvent = await findAudioEvent(page, (audioEvent) => (
    audioEvent.type === 'play' && !!audioEvent.src?.includes('/api/premium-tts?format=audio')
  ));

  expect(directPlayEvent).toMatchObject({
    type: 'play',
    playbackRate: 1.0,
  });

  await expect(audioControls.getByText(/Item 2/i)).toBeVisible({ timeout: 6_000 });
});

test('playback speed slider changes the active real-audio rate', async ({ page }) => {
  await setupRealAudioMocks(page);
  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  await expect(audioControls).toBeVisible();

  const speedSlider = audioControls.getByRole('slider').first();
  await expect(speedSlider).toHaveAttribute('aria-valuenow', '1');
  await speedSlider.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(speedSlider).toHaveAttribute('aria-valuenow', '1.5');

  await audioControls.getByRole('button', { name: /play/i }).click();

  await expect.poll(async () => {
    const event = await findAudioEvent(page, (audioEvent) => (
      audioEvent.type === 'play' &&
      !!audioEvent.src?.includes('/api/premium-tts?format=audio') &&
      audioEvent.playbackRate === 1.5
    ));
    return Boolean(event);
  }).toBe(true);
});

test('autoplay Pause stops active real audio and returns the control to Play', async ({ page }) => {
  await setupRealAudioMocks(page);
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs = 5_000;
  });

  const audioControls = page.locator('.audio-controls');
  await expect(audioControls).toBeVisible();

  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  await audioControls.getByRole('button', { name: /pause/i }).click();
  await expect(audioControls.getByRole('button', { name: /play/i })).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const events = (window as unknown as { __audioEvents: Array<{ type: string }> }).__audioEvents;
    return events.some((event) => event.type === 'pause');
  })).toBe(true);
});

test('autoplay surfaces a clear error when premium TTS fails', async ({ page }) => {
  await page.route('**/api/premium-tts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        fallback: true,
        error: 'Premium TTS is unavailable for background audio',
      }),
    });
  });

  await page.addInitScript(() => {
    class MockAudio {
      src = '';
      preload = '';
      paused = true;
      ended = false;
      loop = false;
      muted = false;
      playbackRate = 1;
      volume = 1;
      play(): Promise<void> {
        this.paused = false;
        return Promise.reject(new Error('mobile autoplay policy rejected playback'));
      }
      pause(): void {
        this.paused = true;
      }
      load(): void { /* noop */ }
      setAttribute(name: string, value: string): void {
        if (name === 'src') this.src = value;
      }
      removeAttribute(name: string): void {
        if (name === 'src') this.src = '';
      }
      addEventListener(): void { /* noop */ }
      removeEventListener(): void { /* noop */ }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: MockAudio,
    });
  });

  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  await expect(audioControls).toBeVisible();

  await audioControls.getByRole('button', { name: /play/i }).click();

  await expect(page.getByText(
    'Audio playback cannot start right now. Premium audio may be unavailable.',
    { exact: true }
  )).toBeVisible();
  await expect(audioControls.getByRole('button', { name: /play/i })).toBeVisible();
});
