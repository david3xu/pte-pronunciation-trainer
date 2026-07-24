import { expect, type Page, test } from '@playwright/test';

// Run this file's tests serially, not in parallel workers. Observed genuine
// flakiness under this machine's default parallel worker count (mock
// setTimeout delays and React render cycles becoming unreliable under
// multi-browser CPU contention, not a logic issue -- confirmed by these
// same tests passing consistently 16/16 with --workers=1). Scoped to this
// file only, so other E2E specs keep their existing parallelism.
test.describe.configure({ mode: 'serial' });

/**
 * Mobile audio smoke coverage for the developer-verifiable parts of the
 * autoplay/manual-TTS flow. This intentionally does not (and cannot) assert
 * anything native-specific: no AVAudioSession, no lock-screen metadata, no
 * real device audio. Capacitor.isNativePlatform() is false in a Playwright
 * browser context, so every path here exercises backgroundAudioService via
 * audioServiceForPlatform exactly as the existing web E2E suite already
 * does; the point of this file is regression coverage for the parts of the
 * web/PWA UI and queue behavior that the native bridge round touched or
 * depends on (handler ownership, queue state, control wiring), not a native
 * smoke test. Real native behavior is real-device-only, per
 * docs/NATIVE_MOBILE_APP_ARCHITECTURE.md's test strategy.
 *
 * Mirrors tests/e2e/tts.spec.ts's established pattern: replace window.Audio
 * with a controllable mock (this app's backgroundAudioService always calls
 * `new Audio()`, never queries an existing <audio> element, so mocking the
 * constructor is the correct level to stub play/pause at) rather than
 * asserting real sound output.
 */

type AudioEventLog = {
  type: string;
  src?: string;
  playbackRate?: number;
  volume?: number;
};

const setupAudioMocks = async (page: Page): Promise<void> => {
  await page.route('**/api/premium-tts**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('mock-mp3-audio'),
        headers: { 'Access-Control-Allow-Origin': '*' },
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
        },
      }),
    });
  });

  await page.addInitScript(() => {
    const events: AudioEventLog[] = [];

    class MockAudio {
      src = '';
      preload = '';
      paused = true;
      ended = false;
      loop = false;
      muted = false;
      volume = 1;
      playbackRate = 1;
      private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

      play(): Promise<void> {
        this.paused = false;
        this.ended = false;
        events.push({ type: 'play', src: this.src, playbackRate: this.playbackRate, volume: this.volume });

        const delay = (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs ?? 60;
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

    Object.defineProperty(window, 'Audio', { configurable: true, value: MockAudio });
    Object.defineProperty(window, '__audioEvents', { configurable: true, value: events });
  });
};

const getItemLabel = (page: Page) => page.locator('.audio-controls').getByText(/^Item \d/);

const currentItemNumber = async (page: Page): Promise<number> => {
  const text = await getItemLabel(page).innerText();
  const match = text.match(/Item (\d+)/);
  return match ? Number(match[1]) : NaN;
};

test('app loads and vocabulary content appears', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');

  await expect(page.locator('.word-card')).toBeVisible();
  await expect(page.locator('.audio-controls')).toBeVisible();
  await expect(getItemLabel(page)).toBeVisible();
});

test('Play enters active autoplay UI state', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();
});

test('Pause enters paused UI state', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs = 2_147_483_647;
  });

  const audioControls = page.locator('.audio-controls');
  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  await audioControls.getByRole('button', { name: /pause/i }).click();
  await expect(audioControls.getByRole('button', { name: /play/i })).toBeVisible();
});

test('Play from paused resumes without resetting progress', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs = 2_147_483_647;
  });

  const audioControls = page.locator('.audio-controls');
  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  const itemBeforePause = await currentItemNumber(page);

  await audioControls.getByRole('button', { name: /pause/i }).click();
  await expect(audioControls.getByRole('button', { name: /play/i })).toBeVisible();

  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  // Resuming in place must not have restarted the queue from item 1.
  expect(await currentItemNumber(page)).toBe(itemBeforePause);
});

test('Next advances progress/item state', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  const itemBefore = await currentItemNumber(page);

  await audioControls.getByRole('button', { name: 'Next' }).click();

  await expect.poll(() => currentItemNumber(page)).toBe(itemBefore + 1);
});

test('Previous remains usable after Next', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');

  const audioControls = page.locator('.audio-controls');
  const itemStart = await currentItemNumber(page);

  await audioControls.getByRole('button', { name: 'Next' }).click();
  await expect.poll(() => currentItemNumber(page)).toBe(itemStart + 1);

  const previousButton = audioControls.getByRole('button', { name: 'Previous' });
  await expect(previousButton).toBeEnabled();
  await previousButton.click();
  await expect.poll(() => currentItemNumber(page)).toBe(itemStart);
});

test('playback speed slider changes value', async ({ page }) => {
  await setupAudioMocks(page);
  await page.goto('/');

  const speedSlider = page.getByTestId('playback-speed-slider').getByRole('slider');
  await expect(speedSlider).toBeVisible();
  const initialValue = await speedSlider.getAttribute('aria-valuenow');
  expect(initialValue).not.toBeNull();

  await speedSlider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  await expect.poll(() => speedSlider.getAttribute('aria-valuenow')).not.toBe(initialValue);
});

test('manual word pronunciation tap does not permanently break autoplay controls', async ({ page }) => {
  test.slow();
  await setupAudioMocks(page);
  await page.goto('/');
  await page.evaluate(() => {
    // Effectively never: this test asserts exact item-count deltas from
    // explicit clicks, so any natural auto-advance sneaking in during the
    // test's own (load-dependent) run time would corrupt the count. A fixed
    // multi-second delay is not safe here since a contended machine can
    // exceed it; the max setTimeout delay browsers honor is the only bound
    // guaranteed longer than any possible test duration.
    (window as unknown as { __mockAudioEndDelayMs?: number }).__mockAudioEndDelayMs = 2_147_483_647;
  });

  const audioControls = page.locator('.audio-controls');
  const wordCard = page.locator('.word-card');

  // Start autoplay first, matching the scenario this actually guards
  // against: a manual tap arriving while the queue already owns playback.
  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();

  // Manual word tap: this routes through TTSEngine's real-audio path, which
  // calls setHandlers() with its own minimal handler set -- exactly the
  // takeover the handler-conflict fix exists for.
  const wordAudioButton = wordCard.getByRole('button').first();
  await expect(wordAudioButton).toBeEnabled();
  await wordAudioButton.click();

  // Autoplay controls must still be fully functional afterward: Pause,
  // then Play (the reclaim path), then Next, all need to keep working, not
  // just render without throwing.
  await audioControls.getByRole('button', { name: /pause/i }).click();
  await expect(audioControls.getByRole('button', { name: /play/i })).toBeVisible();

  const itemBeforeResume = await currentItemNumber(page);
  await audioControls.getByRole('button', { name: /play/i }).click();
  await expect(audioControls.getByRole('button', { name: /pause/i })).toBeVisible();
  expect(await currentItemNumber(page)).toBe(itemBeforeResume);

  // Next already has dedicated coverage above; this only needs to confirm
  // it is still a live, clickable control and not dead/disabled after a
  // manual tap and reclaim. Previous is correctly disabled at item index 0
  // regardless (see AudioControls.tsx), unrelated to this test's concern.
  await expect(audioControls.getByRole('button', { name: 'Next' })).toBeEnabled();
});
