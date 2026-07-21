/**
 * WordCard Component
 *
 * Displays vocabulary word/sentence with pronunciation information.
 * Replaces the vanilla JS word card UI.
 * Includes template color coding for DI shadowing practice.
 */

import { PlayIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Checkbox, Flex, Text } from '@radix-ui/themes';
import React, { useState } from 'react';
import '../../css/shadowing.css'; // Import shadowing styles
import { ttsEngine } from '../../services/audio/TTSEngine';
import type { SessionManager } from '../../services/session/sessionManager';
import { useTTSState } from '../../stores';
import type { ItemType } from '../../types/database';
import type { PracticeItem, VocabularyTerm } from '../../types/dataset.types';
import { parseAnswerForDisplay } from '../../utils/templateParser';
import { cleanText } from '../../utils/textUtils';

interface WordCardProps {
  item: VocabularyTerm | PracticeItem;
  sessionManager?: SessionManager;
  onItemComplete?: (isCorrect?: boolean) => void;
}

const WordCard: React.FC<WordCardProps> = ({ item, sessionManager, onItemComplete }) => {
  const ttsState = useTTSState();
  const [playCount, setPlayCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [showTemplateColors, setShowTemplateColors] = useState(true);

  // Determine if this is a vocabulary term or practice item
  // Handle both 'word' and 'english' field names for backwards compatibility
  const isVocabularyTerm = 'word' in item || 'english' in item;
  const isPracticeSentence = 'sentence' in item;
  const isPracticeQuestion = 'question' in item;

  // Extract relevant fields - support both old and new field names
  const displayText = isVocabularyTerm
    ? ((item as any).word || (item as any).english)
    : isPracticeSentence
    ? 'sentence' in item ? item.sentence : ''
    : 'question' in item ? item.question : '';

  const difficulty = 'difficulty' in item
    ? item.difficulty
    : ('metadata' in item && item.metadata?.difficulty) || 'normal';

  // Check if this is a shadowing item (has fullText or phrases)
  const isShadowingItem = (item as any).fullText || (item as any).phrases;
  const fullAnswerText = (item as any).fullText;

  // Handle both 'ipa' and 'pronunciation' field names
  // JSON format: pronunciation.british.ipa vs type format: ipa.british
  // Also handle single IPA format: pronunciation.ipa (not nested)
  const rawItem = item as any;
  const ipa = isVocabularyTerm
    ? (rawItem.ipa || (rawItem.pronunciation ? {
        // If pronunciation has direct ipa/phonetic (single format), use as single
        // Otherwise check for british/american nested format
        british: rawItem.pronunciation.british?.ipa,
        american: rawItem.pronunciation.american?.ipa,
        single: rawItem.pronunciation.ipa || rawItem.pronunciation.single?.ipa
      } : null))
    : null;

  // Extract phonetic spelling
  const phonetic = isVocabularyTerm
    ? (rawItem.phonetic || (rawItem.pronunciation ? {
        british: rawItem.pronunciation.british?.phonetic,
        american: rawItem.pronunciation.american?.phonetic,
        single: rawItem.pronunciation.phonetic || rawItem.pronunciation.single?.phonetic
      } : null))
    : null;

  // Handle TTS playback
  const handleSpeak = async (_mode: 'word' | 'sentence' | 'question' = 'word', accent?: 'british' | 'american') => {
    console.log('[WordCard] handleSpeak called:', { displayText, accent });

    // Track play count for session
    const newPlayCount = playCount + 1;
    setPlayCount(newPlayCount);

    const cleanedText = cleanText(displayText);
    const langCode = accent === 'british' ? 'en-GB' : accent === 'american' ? 'en-US' : 'en-US';
    console.log(`[WordCard] Calling ttsEngine.pronounceText with: "${cleanedText}" in ${langCode}`);
    let playbackSucceeded = false;
    try {
      await ttsEngine.pronounceText(cleanedText, langCode, null);
      console.log('[WordCard] ttsEngine.pronounceText completed');
      playbackSucceeded = true;
    } catch (error) {
      console.error('[WordCard] TTS error:', error);
    }

    // Record item interaction in session
    if (sessionManager) {
      try {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const itemType: ItemType = isVocabularyTerm ? 'word' : isPracticeSentence ? 'sentence' : 'question';

        await sessionManager.recordItem({
          item_id: (item as any).id || `${displayText}-${Date.now()}`,
          item_type: itemType,
          item_text: displayText,
          attempts: newPlayCount,
          time_spent_sec: timeSpent,
        });
        console.log('[WordCard] Recorded item interaction');
      } catch (error) {
        console.error('[WordCard] Failed to record item:', error);
      }
    }

    // Mark the current item completed only on successful playback, independent
    // of the best effort session recording above (absent in guest mode and may
    // fail). A failed TTS attempt does not count. Passive playback has no
    // correctness signal, so a successful play counts as completed and correct.
    if (playbackSucceeded && onItemComplete) {
      onItemComplete(true);
    }
  };

  // Difficulty color mapping
  const difficultyColor = {
    easy: 'green',
    normal: 'blue',
    hard: 'red',
  }[difficulty as string] || 'gray';

  const isSpeaking = ttsState.isSpeaking;

  return (
    <Card size="4" className="word-card animate-in">
      {/* Header with difficulty badge */}
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="2">
        <Flex gap="2" align="center">
          <Badge color={difficultyColor as any} size="2">
            {difficulty}
          </Badge>
          {isVocabularyTerm && (item as any).category && (
            <Badge color="gray" size="2" variant="soft">
              {(item as any).category}
            </Badge>
          )}
        </Flex>

      </Flex>

      {/* Main content - Word/Sentence/Question */}
      <Flex direction="column" gap="4">
        <Text size="8" weight="bold" className="text-primary">
          {cleanText(displayText)}
        </Text>

        {/* Pronunciation (for vocabulary terms) */}
        {isVocabularyTerm && ipa && (
          <Flex direction="column" gap="3">
            {/* British pronunciation */}
            {ipa.british && (
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" weight="medium">
                  🇬🇧 British
                </Text>
                <Flex align="center" gap="2">
                  <Text size="4" className="font-mono text-accent">
                    {ipa.british}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleSpeak('word', 'british')}
                    disabled={isSpeaking}
                  >
                    <SpeakerLoudIcon />
                  </Button>
                </Flex>
                {phonetic?.british && (
                  <Text size="3" color="gray" className="italic">
                    Sounds like: <strong>{phonetic.british}</strong>
                  </Text>
                )}
              </Flex>
            )}

            {/* American pronunciation */}
            {ipa.american && (
              <Flex direction="column" gap="1" mt="2">
                <Text size="2" color="gray" weight="medium">
                  🇺🇸 American
                </Text>
                <Flex align="center" gap="2">
                  <Text size="4" className="font-mono text-accent">
                    {ipa.american}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleSpeak('word', 'american')}
                    disabled={isSpeaking}
                  >
                    <SpeakerLoudIcon />
                  </Button>
                </Flex>
                {phonetic?.american && (
                  <Text size="3" color="gray" className="italic">
                    Sounds like: <strong>{phonetic.american}</strong>
                  </Text>
                )}
              </Flex>
            )}

            {/* Single pronunciation (for books with single IPA format) */}
            {ipa.single && !ipa.british && !ipa.american && (
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" weight="medium">
                  Pronunciation
                </Text>
                <Flex align="center" gap="2">
                  <Text size="4" className="font-mono text-accent">
                    {ipa.single}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleSpeak('word')}
                    disabled={isSpeaking}
                  >
                    <SpeakerLoudIcon />
                  </Button>
                </Flex>
                {phonetic?.single && (
                  <Text size="3" color="gray" className="italic">
                    Sounds like: <strong>{phonetic.single}</strong>
                  </Text>
                )}
              </Flex>
            )}
          </Flex>
        )}

        {/* Play button for practice items */}
        {(isPracticeSentence || isPracticeQuestion) && (
          <Button
            size="3"
            variant="solid"
            onClick={() => handleSpeak(isPracticeSentence ? 'sentence' : 'question')}
            disabled={isSpeaking}
          >
            <PlayIcon width="16" height="16" />
            {isSpeaking ? 'Speaking...' : 'Play Audio'}
          </Button>
        )}

        {/* Additional metadata */}
        {isVocabularyTerm && (item as any).definition && (
          <Flex direction="column" gap="2" mt="2">
            <Text size="2" color="gray" weight="medium">
              Definition
            </Text>
            <Text size="3" color="gray">
              {(item as any).definition}
            </Text>
          </Flex>
        )}

        {/* Full DI Answer Display (for shadowing mode) */}
        {isShadowingItem && fullAnswerText && (() => {
          const template = (item as any).template || 'A';
          const parsed = parseAnswerForDisplay(fullAnswerText, template);

          console.log('[WordCard] Template:', template);
          console.log('[WordCard] Parsed sentences:', parsed.sentences.length);
          console.log('[WordCard] First sentence segments:', parsed.sentences[0]?.segments);

          return (
            <Flex direction="column" gap="3" mt="4" className="bg-app-bg-card p-4 rounded-lg border border-app-border">
              <Flex justify="between" align="center">
                <Text size="2" color="blue" weight="bold" className="uppercase tracking-wide">
                  📝 Complete Answer (Template {template})
                </Text>
              </Flex>

              {/* Color Legend */}
              {showTemplateColors && (
                <div className="color-legend">
                  <div className="legend-item">
                    <div className="legend-color template"></div>
                    <span className="legend-label">Template (Memorize)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color variable"></div>
                    <span className="legend-label">Variable (Fill in)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color stress"></div>
                    <span className="legend-label">STRESS Words</span>
                  </div>
                </div>
              )}

              {/* Color Toggle */}
              <div className="color-toggle-container">
                <label className="color-toggle-label">
                  <Checkbox
                    checked={showTemplateColors}
                    onCheckedChange={(checked) => setShowTemplateColors(checked === true)}
                    className="color-toggle-checkbox"
                  />
                  <span>Show Template Colors</span>
                </label>
              </div>

              {/* Answer Text with Color Coding */}
              <div className={`answer-text ${!showTemplateColors ? 'no-colors' : ''}`} style={{ lineHeight: '2', fontSize: '1.1rem', color: '#e5e7eb' }}>
                {parsed.sentences.map((sentence, sentenceIdx) => (
                  <div key={sentenceIdx} style={{ marginBottom: '1rem' }}>
                    {sentence.segments.map((segment, segmentIdx) => {
                      // Split segment by words to apply stress individually
                      const words = segment.text.split(/(\s+)/); // Keep spaces

                      // Debug log for first sentence
                      if (sentenceIdx === 0 && segmentIdx < 3) {
                        console.log(`[WordCard] Segment ${segmentIdx}:`, {
                          text: segment.text,
                          type: segment.type,
                          words: words.length
                        });
                      }

                      return (
                        <span key={segmentIdx}>
                          {words.map((word, wordIdx) => {
                            // Skip empty strings
                            if (!word) return null;

                            // If it's just whitespace, render as-is
                            if (word.trim() === '') return <React.Fragment key={wordIdx}>{word}</React.Fragment>;

                            // Check if this individual word is all-caps (stress word)
                            const isStress = word === word.toUpperCase() && word.length > 1 && /[A-Z]/.test(word);

                            const classes = [];
                            if (showTemplateColors) {
                              if (segment.type === 'template') classes.push('template-phrase');
                              if (segment.type === 'variable') classes.push('variable-content');
                              if (isStress) classes.push('stress-word');
                            }

                            const style: React.CSSProperties = showTemplateColors ? {} : {
                              color: 'inherit',
                              fontWeight: 'inherit',
                              background: 'transparent'
                            };

                            return (
                              <span key={wordIdx} className={classes.join(' ')} style={style}>
                                {word}
                              </span>
                            );
                          })}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>

              <Text size="1" color="gray" className="italic">
                💡 The audio will play each phrase continuously. Listen and shadow along!
              </Text>
            </Flex>
          );
        })()}
      </Flex>
    </Card>
  );
};

export default WordCard;
