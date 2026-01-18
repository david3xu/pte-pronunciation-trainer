---
description: How to add a new 90+ essay topic, including mapping vocabulary and updating the word book.
---

# Workflow: Adding a New 90+ Essay Topic

This workflow ensures that new essay topics maintain the 90+ standard and the vocabulary book stays synchronized.

## Step 1: Map B1 Vocabulary to 90+ Logic
1.  Open `essay-examples-template-b1.md` and find the relevant Example topic.
2.  Extract the **vocabulary terms ONLY** (Subjects, Positive Outcomes, Negative Outcomes).
    *   **⚠️ CRITICAL:** Extract vocabulary terms ONLY. DO NOT copy template structure or evidence patterns from B1 examples.
    *   The B1 file contains older patterns ("According to research by experts") that will reduce your score to 68-74.
3.  Map these terms to the **90+ Logic Chain** slots:
    *   **Action Paraphrase:** (e.g., "involving employees")
    *   **Outcome 1 (Immediate):** (e.g., "higher loyalty")
    *   **Outcome 2 (Result):** (e.g., "better suggestions")
    *   **Outcome 3 (Broad):** (e.g., "increased revenue")
    *   **Negative Root:** (e.g., "extensive consultation")
    *   **Negative Obstacle:** (e.g., "slower decision processes")

## Step 2: Write the Essay
1.  Open `how-to-write-90plus-essay.md`.
2.  Add a new section: `## Example [N]: [Topic Name]`.
3.  Copy the **90+ Template** structure (Session 1, lines 59-127).
4.  **Fill in the slots** using the mapped B1 vocabulary terms.
    *   **CRITICAL:** Use the exact B1 vocabulary terms where possible for ease of memorization.
    *   **CRITICAL:** Bold **ONLY** the filled terms (the parts you typed).
    *   **CRITICAL:** Keep standard template phrases (e.g., "in modern") PLAIN.
    *   **CRITICAL - Avoid High Repetition (8-11 times):**
        *   ✅ **USE SMART variations:** synonyms ("employee participation" → "this collaborative approach"), different forms ("governments should take" → "government-led"), paraphrases ("involving employees" → "collaborative approach")
        *   ✅ **Short/long variations OK:** "employee participation in decision-making" (first use) → "employee participation" (later) is acceptable
        *   ❌ **AVOID dumb variations:** Just appending/removing words ("governments should take responsibility" → "governments should take responsibility for climate action")
        *   **Goal:** Show vocabulary range while staying B1/B2 (easy and academic)
    *   **CRITICAL - Evidence Pattern (90+ ONLY):**
        *   ✅ **USE:** "[Subject group] who [action] demonstrate [result]"
        *   ✅ **USE:** "[Specific context] that [behavior] create pressure to [action]"
        *   ❌ **NEVER:** "According to research by [experts]" (B1 pattern - reduces score to 68-74)
        *   ❌ **NEVER:** "evidence from [source] shows" (sounds fake)

## Step 3: Update Vocabulary Book
1.  Open `data/source/pte/vocabs/pte-essay-90plus-filled-terms.md`.
2.  Extract every **unique bolded phrase** from the new essay.
3.  Append them to the list:
    *   Format: `N. [Bolded Phrase] | /[IPA]/`
    *   Ensure the phrase is the **complete filled chunk** (e.g., "require consensus from multiple departments").
4.  Update the `Total Terms` count in the file header.

## Step 4: Process Data
// turbo
1.  Run the data pipeline to update the JSON:
    ```bash
    npm run data
    ```
2.  Verify the output in `data/processed/pte-essay-90plus-filled-terms.json`.

## Step 5: Final Verification
1.  Check the essay for **Logic Chain** validity (Cause -> Effect).
2.  Check for **Bolding Accuracy** (Template = Plain, Fill-in = Bold).
3.  Check for **90+ Evidence Pattern** (no "According to research" phrases).
4.  Check that the essay **answers the question directly** (especially for "necessary", "prefer", or comparison questions).