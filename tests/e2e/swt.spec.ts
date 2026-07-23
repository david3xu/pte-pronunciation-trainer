import { expect, type Page, test } from '@playwright/test';

const openSettings = async (page: Page) => {
  // Present regardless of viewport width: the visible "Settings" label text
  // is hidden on small screens, but the title attribute is not.
  await page.getByTitle('Change mode, difficulty, and voice settings').click();
  await expect(page.getByText('Study Type')).toBeVisible();
};

const closeSettings = async (page: Page) => {
  // The close button has no accessible name (icon only), but it is the
  // first true role="button" element in the panel: Select triggers are
  // role="combobox" and the tabs are role="tab", not "button".
  await page.locator('.rt-BaseCard').getByRole('button').first().click();
};

/** Selects a Study Type option. Settings must already be open. */
const selectStudyType = async (page: Page, optionName: RegExp | string) => {
  // Study Type is the first combobox in the panel (Vocabulary Book, Task
  // Type, or Writing Task, each of which only appears once a type is
  // chosen and are mutually exclusive, would be the second).
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: optionName }).click();
};

/** Selects a Task Type option. Settings must already be open with Task Practice selected. */
const selectTaskType = async (page: Page, optionName: RegExp | string) => {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: optionName }).click();
};

/** Selects a Writing Task option. Settings must already be open with Writing Practice selected. */
const selectWritingTask = async (page: Page, optionName: RegExp | string) => {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: optionName }).click();
};

const wfdTextarea = (page: Page) => page.getByPlaceholder('Type the sentence here...');
// The typing capture input is intentionally visually hidden (sr-only): the
// rendered, per-character highlighted target text is the main visual UI.
const typingInput = (page: Page) => page.getByLabel('Type the target text');
const typingTarget = (page: Page) => page.getByTestId('typing-target');

/**
 * SWT Answer Typing lives under the reusable Writing Practice study type.
 * This is Monkeytype-style exact-text typing practice using a real SWT
 * model answer as the target, not a real PTE SWT test: no word/sentence
 * bounds, no Valid/Invalid PTE status, scored on typing accuracy and speed.
 */
test('selecting Writing Practice then SWT Answer Typing loads the typing page and completing it shows typing results', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await selectWritingTask(page, /SWT Answer Typing/i);
  await closeSettings(page);

  // Dataset load is async; the target only renders once it resolves.
  await expect(typingTarget(page)).toBeVisible();
  const targetText = (await typingTarget(page).textContent()) ?? '';
  expect(targetText.length).toBeGreaterThan(0);

  // No PTE exam framing anywhere on this page.
  await expect(page.getByText(/valid/i)).not.toBeVisible();
  await expect(page.getByText(/\bwords\b/i)).not.toBeVisible();

  await typingInput(page).fill(targetText);

  await expect(page.getByText('Results')).toBeVisible();
  await expect(page.getByText(/wpm/i)).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible(); // typed exactly, full accuracy
  await expect(page.getByText('Completed')).toBeVisible();
});

/**
 * Regression for a real bug: the Study Type switch used to only reload a
 * dataset when a stale field (practiceMode, writingMode) looked wrong, so
 * WFD -> Writing/SWT -> Practice left practiceMode saying WFD but the
 * active dataset still showing SWT.
 */
test('switching WFD then Writing/SWT then back to Practice renders WFD, not a leftover SWT page', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Task Practice/i);
  await selectTaskType(page, /Write From Dictation/i);
  await closeSettings(page);

  await expect(page.getByText('✍️ Write From Dictation')).toBeVisible();
  await expect(wfdTextarea(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await selectWritingTask(page, /SWT Answer Typing/i);
  await closeSettings(page);

  await expect(typingTarget(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Task Practice/i);
  await closeSettings(page);

  // The regression: this used to still show the SWT page here.
  await expect(typingTarget(page)).not.toBeVisible();
  await expect(page.getByText('✍️ Write From Dictation')).toBeVisible();
  await expect(wfdTextarea(page)).toBeVisible();
});

/**
 * Regression for the other half of the same bug: once writingMode has been
 * set to 'swt' by an earlier visit, switching to Writing Practice a second
 * time used to be skipped entirely because the stale guard already thought
 * SWT was loaded.
 */
test('switching to Writing/SWT reliably loads it even on a second visit after Practice', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await selectWritingTask(page, /SWT Answer Typing/i);
  await closeSettings(page);

  await expect(typingTarget(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Task Practice/i);
  await closeSettings(page);

  // First time switching to practice in this session, so it defaults to RS.
  await expect(page.getByText('🎧 Repeat Sentence')).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await closeSettings(page);

  // The regression: practiceType correctly becomes 'writing' either way (it
  // is set unconditionally), so the SWT shell would render even when the
  // reload was wrongly skipped. The tell is the target text content itself:
  // with a stale RS item underneath, there is no .answer field to read.
  await expect(page.getByText('🎧 Repeat Sentence')).not.toBeVisible();
  await expect(typingTarget(page)).toBeVisible();
  const targetText = await typingTarget(page).textContent();
  expect((targetText ?? '').trim().length).toBeGreaterThan(20);
});

/**
 * Covers the actual migration code in stores/index.ts, not just the live
 * switching logic: a browser that still has the flat practiceType 'swt'
 * persisted (from before Writing Practice existed as a reusable page) must
 * land on Writing Practice with a real, non-empty target text after
 * reload, not a raw 'swt' value the current Study Type options no longer have.
 */
test('old persisted flat swt practiceType migrates to Writing Practice on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pte-app-storage',
      JSON.stringify({
        state: {
          settings: { practiceType: 'swt', practiceMode: null, vocabularyBook: 'swt', datasetId: 'swt' },
        },
        version: 0,
      })
    );
  });

  await page.goto('/');

  await expect(typingTarget(page)).toBeVisible();
  const targetText = await typingTarget(page).textContent();
  expect((targetText ?? '').trim().length).toBeGreaterThan(0);

  await openSettings(page);
  await expect(page.getByRole('combobox').first()).toContainText(/Writing Practice/i);
});

/**
 * Same migration coverage for the even older shape, from before SWT was
 * even its own practiceType: nested under 'practice' as a practiceMode
 * string the same way as RS/ASQ/WFD.
 */
test('old persisted practice-summarize-written-text practiceMode migrates to Writing Practice on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pte-app-storage',
      JSON.stringify({
        state: {
          settings: { practiceType: 'practice', practiceMode: 'practice-summarize-written-text', vocabularyBook: 'pte-my-ra' },
        },
        version: 0,
      })
    );
  });

  await page.goto('/');

  await expect(typingTarget(page)).toBeVisible();
  const targetText = await typingTarget(page).textContent();
  expect((targetText ?? '').trim().length).toBeGreaterThan(0);

  await openSettings(page);
  await expect(page.getByRole('combobox').first()).toContainText(/Writing Practice/i);
});
