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

const swtTextarea = (page: Page) => page.getByPlaceholder('Type your one sentence summary here...');
const wfdTextarea = (page: Page) => page.getByPlaceholder('Type the sentence here...');
const swtPassageText = (page: Page) => page.locator('p:has-text("Original passage") + p').textContent();

/**
 * SWT lives under the reusable Writing Practice study type (not its own
 * top level type), so this covers picking Writing Practice then the SWT
 * writing task from Settings and completing one full attempt: passage +
 * timer/options render, a valid one sentence summary can be typed, and
 * submitting shows a result.
 */
test('selecting Writing Practice then SWT from Settings loads the SWT page and accepts a valid submission', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await selectWritingTask(page, /Summarize Written Text/i);
  await closeSettings(page);

  // Dataset load is async; the passage label only renders once it resolves.
  await expect(page.getByText('Original passage')).toBeVisible();

  const textarea = swtTextarea(page);
  await expect(textarea).toBeVisible();
  // Compact status bar: timer, "X/75 words", "X sentence(s)", live status.
  await expect(page.getByText(/\d+\/75 words/)).toBeVisible();
  await expect(page.getByText(/\d+ sentences?/)).toBeVisible();
  // Timer starts at 10:00 and only counts down once typing begins.
  await expect(page.getByText('10:00')).toBeVisible();

  await textarea.fill(
    'This passage explains an important concept relevant to the topic discussed in detail throughout the text.'
  );

  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Results')).toBeVisible();
  await expect(page.getByText('Model answer')).toBeVisible();
  await expect(page.getByText('Valid')).toBeVisible();
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
  await selectWritingTask(page, /Summarize Written Text/i);
  await closeSettings(page);

  await expect(swtTextarea(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Task Practice/i);
  await closeSettings(page);

  // The regression: this used to still show the SWT page here.
  await expect(swtTextarea(page)).not.toBeVisible();
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
  await selectWritingTask(page, /Summarize Written Text/i);
  await closeSettings(page);

  await expect(swtTextarea(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Task Practice/i);
  await closeSettings(page);

  // First time switching to practice in this session, so it defaults to RS.
  await expect(page.getByText('🎧 Repeat Sentence')).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await closeSettings(page);

  // The regression: practiceType correctly becomes 'writing' either way (it
  // is set unconditionally), so the SWT shell renders even when the reload
  // was wrongly skipped. The tell is the passage paragraph itself: with a
  // stale RS item underneath, SWTInterface has no .passage field to read
  // and renders it empty, so checking the label alone is not enough.
  await expect(page.getByText('🎧 Repeat Sentence')).not.toBeVisible();
  await expect(swtTextarea(page)).toBeVisible();
  const passageText = await swtPassageText(page);
  expect((passageText ?? '').trim().length).toBeGreaterThan(20);
});

/**
 * Covers the actual migration code in stores/index.ts, not just the live
 * switching logic: a browser that still has the flat practiceType 'swt'
 * persisted (from before Writing Practice existed as a reusable page) must
 * land on Writing Practice with a real, non-empty SWT passage after reload,
 * not a raw 'swt' value the current Study Type options no longer have.
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

  await expect(page.getByText('Original passage')).toBeVisible();
  const passageText = await swtPassageText(page);
  expect((passageText ?? '').trim().length).toBeGreaterThan(20);

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

  await expect(page.getByText('Original passage')).toBeVisible();
  const passageText = await swtPassageText(page);
  expect((passageText ?? '').trim().length).toBeGreaterThan(20);

  await openSettings(page);
  await expect(page.getByRole('combobox').first()).toContainText(/Writing Practice/i);
});
