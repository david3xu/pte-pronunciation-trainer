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
  // Study Type is the first combobox in the panel (Vocabulary Book or
  // Writing Task, each of which only appears once a type is chosen and are
  // mutually exclusive, would be the second).
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: optionName }).click();
};

/** Selects a Writing Task option. Settings must already be open with Writing Practice selected. */
const selectWritingTask = async (page: Page, optionName: RegExp | string) => {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: optionName }).click();
};

// The typing capture input is intentionally visually hidden (sr-only): the
// rendered, per-character highlighted target text is the main visual UI.
const typingInput = (page: Page) => page.getByLabel('Type the target text');
const typingTarget = (page: Page) => page.getByTestId('typing-target');

/**
 * Writing tasks live under the reusable Writing Practice study type. This is
 * Monkeytype-style exact-text typing practice, not a real PTE writing test:
 * no Valid/Invalid PTE status, scored on typing accuracy and speed.
 */
test('selecting Writing Practice then Essay B1 Terms loads the typing page and completing it shows typing results', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await selectWritingTask(page, /Essay B1 Terms/i);
  await closeSettings(page);

  // Dataset load is async; the target only renders once it resolves.
  await expect(typingTarget(page)).toBeVisible();
  const targetText = (await typingTarget(page).textContent()) ?? '';
  expect(targetText.length).toBeGreaterThan(0);

  // No PTE exam framing anywhere on this page.
  await expect(page.getByText(/valid/i)).not.toBeVisible();

  await typingInput(page).fill(targetText);

  await expect(page.getByText('Results')).toBeVisible();
  await expect(page.getByText(/wpm/i)).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible(); // typed exactly, full accuracy
  await expect(page.getByText('Completed')).toBeVisible();
});

/**
 * Regression for a real bug: once writingMode has been set by an earlier
 * visit, switching to Writing Practice a second time used to be skipped
 * entirely because a stale guard already thought the task was loaded.
 */
test('switching to Writing Practice reliably loads it even on a second visit after Vocabulary', async ({ page }) => {
  await page.goto('/');

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await closeSettings(page);

  await expect(typingTarget(page)).toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Vocabulary Learning/i);
  await closeSettings(page);

  await expect(typingTarget(page)).not.toBeVisible();

  await openSettings(page);
  await selectStudyType(page, /Writing Practice/i);
  await closeSettings(page);

  // practiceType becomes 'writing' either way, so the typing shell would
  // render even if the reload were wrongly skipped. The tell is the target
  // text itself: a stale vocabulary item underneath has no typing target.
  await expect(typingTarget(page)).toBeVisible();
  const targetText = await typingTarget(page).textContent();
  expect((targetText ?? '').trim().length).toBeGreaterThan(20);
});

/**
 * Covers the migration code in stores/index.ts: a browser that still has a
 * removed study type persisted (Task Practice RS/ASQ/WFD) must land on
 * Vocabulary Learning after reload, not an empty page for a missing dataset.
 */
test('old persisted Task Practice study type migrates to Vocabulary Learning on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pte-app-storage',
      JSON.stringify({
        state: {
          settings: {
            practiceType: 'practice',
            practiceMode: 'practice-write-from-dictation',
            vocabularyBook: 'pte-rs-segments',
            datasetId: 'practice-write-from-dictation',
          },
        },
        version: 0,
      })
    );
  });

  await page.goto('/');

  await openSettings(page);
  await expect(page.getByRole('combobox').first()).toContainText(/Vocabulary Learning/i);
});

/**
 * Same migration coverage for a removed writing task: Writing Practice is
 * kept, but the persisted task falls back to one that still exists.
 */
test('old persisted removed writing task migrates to a remaining writing task on load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pte-app-storage',
      JSON.stringify({
        state: {
          settings: { practiceType: 'writing', writingMode: 'swt', vocabularyBook: 'pte-my-ra', datasetId: 'swt' },
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
