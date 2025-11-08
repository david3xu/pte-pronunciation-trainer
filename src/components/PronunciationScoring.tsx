/**
 * PronunciationScoring Component
 *
 * Records user pronunciation and provides AI-powered feedback.
 * Uses Web Speech Recognition API for speech-to-text conversion.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Flex, Text, Button, Badge, Progress, ScrollArea } from '@radix-ui/themes';
import {
  SpeakerLoudIcon,
  StopIcon,
  PlayIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from '../ts/stores';
import { getPronunciationScore } from '../api/ai';

interface PronunciationScoringProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ScoringResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  transcription: string;
  targetText: string;
}

const PronunciationScoring: React.FC<PronunciationScoringProps> = ({ isOpen = true, onClose }) => {
  const { vocabulary } = useAppStore();
  const currentItem = vocabulary.currentItem;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoringResult[]>([]);
  const [, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get target text from current item
  const targetText = (currentItem && 'word' in currentItem) ? currentItem.word :
                     (currentItem && 'sentence' in currentItem) ? currentItem.sentence :
                     (currentItem && 'question' in currentItem) ? currentItem.question : '';

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      handleTranscription(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Recognition error: ${event.error}`);
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  // Start recording
  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return;
    }

    setError(null);
    setResult(null);
    setTranscript('');
    setIsRecording(true);

    try {
      recognitionRef.current.start();

      // Auto-stop after 10 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        handleStopRecording();
      }, 10000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
  };

  // Handle transcription and get AI scoring
  const handleTranscription = async (transcribedText: string) => {
    setIsProcessing(true);

    try {
      const difficulty = (currentItem && 'difficulty' in currentItem) ? currentItem.difficulty :
                        (currentItem && 'metadata' in currentItem && currentItem.metadata?.difficulty) ? currentItem.metadata.difficulty : 'normal';

      const scoringResult = await getPronunciationScore(
        targetText,
        transcribedText,
        difficulty as string
      );

      setResult(scoringResult);
      setHistory([scoringResult, ...history.slice(0, 4)]); // Keep last 5 attempts
      setError(null);
    } catch (err) {
      console.error('Pronunciation scoring error:', err);
      setError('Failed to analyze pronunciation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry recording
  const handleRetry = () => {
    setResult(null);
    setTranscript('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Text size="4" weight="bold">Pronunciation Practice</Text>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>Close</Button>
          )}
        </Flex>

        {/* Target Text */}
        <Flex
          p="4"
          style={{
            backgroundColor: 'var(--accent-3)',
            borderRadius: 'var(--radius-3)',
            borderLeft: '4px solid var(--accent-9)',
          }}
        >
          <Flex direction="column" gap="2" style={{ width: '100%' }}>
            <Text size="1" color="gray" weight="medium">Say this:</Text>
            <Text size="5" weight="bold">{targetText}</Text>
            {currentItem && 'phonetic' in currentItem && currentItem.phonetic && (
              <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>
                {String(currentItem.phonetic)}
              </Text>
            )}
          </Flex>
        </Flex>

        {/* Recording Controls */}
        <Flex direction="column" gap="3" align="center">
          {!isRecording && !isProcessing && !result && (
            <Button
              size="4"
              onClick={handleStartRecording}
              disabled={!targetText}
              style={{ width: '100%' }}
            >
              <SpeakerLoudIcon width="20" height="20" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Flex direction="column" gap="2" align="center" style={{ width: '100%' }}>
              <Button
                size="4"
                color="red"
                onClick={handleStopRecording}
                style={{ width: '100%' }}
              >
                <StopIcon width="20" height="20" />
                Stop Recording
              </Button>
              <Flex align="center" gap="2">
                <span className="animate-pulse text-red-500">●</span>
                <Text size="2" color="gray">Recording... (max 10s)</Text>
              </Flex>
            </Flex>
          )}

          {isProcessing && (
            <Flex direction="column" gap="2" align="center">
              <ReloadIcon width="24" height="24" className="animate-spin" />
              <Text size="2" color="gray">Analyzing pronunciation...</Text>
            </Flex>
          )}
        </Flex>

        {/* Error Display */}
        {error && (
          <Flex
            p="3"
            style={{
              backgroundColor: 'var(--red-3)',
              borderRadius: 'var(--radius-3)',
              border: '1px solid var(--red-6)',
            }}
          >
            <Text size="2" color="red">{error}</Text>
          </Flex>
        )}

        {/* Result Display */}
        {result && (
          <Flex direction="column" gap="4">
            {/* Score */}
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="3" weight="medium">Score</Text>
                <Badge
                  size="2"
                  color={
                    result.score >= 90 ? 'green' :
                    result.score >= 70 ? 'blue' :
                    result.score >= 50 ? 'orange' :
                    'red'
                  }
                >
                  {result.score}%
                </Badge>
              </Flex>
              <Progress
                value={result.score}
                max={100}
                color={
                  result.score >= 90 ? 'green' :
                  result.score >= 70 ? 'blue' :
                  result.score >= 50 ? 'orange' :
                  'red'
                }
              />
            </Flex>

            {/* Transcription */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">You said:</Text>
              <Flex
                p="3"
                style={{
                  backgroundColor: 'var(--gray-3)',
                  borderRadius: 'var(--radius-3)',
                }}
              >
                <Text size="2">{result.transcription}</Text>
              </Flex>
            </Flex>

            {/* Feedback */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">Feedback:</Text>
              <Text size="2">{result.feedback}</Text>
            </Flex>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" color="green">
                  <CheckCircledIcon className="inline" /> Strengths:
                </Text>
                <Flex direction="column" gap="1">
                  {result.strengths.map((strength, idx) => (
                    <Text key={idx} size="2" color="gray">• {strength}</Text>
                  ))}
                </Flex>
              </Flex>
            )}

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" color="orange">
                  <CrossCircledIcon className="inline" /> Areas to Improve:
                </Text>
                <Flex direction="column" gap="1">
                  {result.improvements.map((improvement, idx) => (
                    <Text key={idx} size="2" color="gray">• {improvement}</Text>
                  ))}
                </Flex>
              </Flex>
            )}

            {/* Action Buttons */}
            <Flex gap="2">
              <Button onClick={handleRetry} variant="outline" style={{ flex: 1 }}>
                Try Again
              </Button>
              {currentItem && (
                <Button
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(targetText);
                    window.speechSynthesis.speak(utterance);
                  }}
                  variant="soft"
                  style={{ flex: 1 }}
                >
                  <PlayIcon width="16" height="16" />
                  Listen Again
                </Button>
              )}
            </Flex>
          </Flex>
        )}

        {/* History */}
        {history.length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">Recent Attempts</Text>
            <ScrollArea style={{ maxHeight: '200px' }}>
              <Flex direction="column" gap="2">
                {history.map((attempt, idx) => (
                  <Flex
                    key={idx}
                    p="2"
                    justify="between"
                    align="center"
                    style={{
                      backgroundColor: 'var(--gray-2)',
                      borderRadius: 'var(--radius-2)',
                    }}
                  >
                    <Text size="2">{attempt.transcription}</Text>
                    <Badge
                      size="1"
                      color={
                        attempt.score >= 90 ? 'green' :
                        attempt.score >= 70 ? 'blue' :
                        attempt.score >= 50 ? 'orange' :
                        'red'
                      }
                    >
                      {attempt.score}%
                    </Badge>
                  </Flex>
                ))}
              </Flex>
            </ScrollArea>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default PronunciationScoring;
