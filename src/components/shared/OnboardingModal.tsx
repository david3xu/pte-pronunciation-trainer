/**
 * OnboardingModal Component
 *
 * First-time user onboarding guide with feature tour.
 * Shows on first visit, dismissible, stored in localStorage.
 */

import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Button } from '@radix-ui/themes';
import { appConfig } from '../../ts/shared/Config';
import {
  Cross2Icon,
  ChatBubbleIcon,
  SpeakerLoudIcon,
  PlayIcon,
  ReaderIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@radix-ui/react-icons';

const ONBOARDING_KEY = 'pte-onboarding-completed';

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '👋 Welcome to PTE Pronunciation Trainer!',
      description: 'Your AI-powered companion for mastering PTE pronunciation',
      features: [
        '🎯 13,000+ vocabulary terms from 13 books',
        '📝 2,507+ practice sentences (RS/ASQ/WFD)',
        '🤖 100% FREE AI features powered by Google Gemini',
        '⭐ Premium AWS Polly neural voices (optional)',
      ],
      cta: 'Get Started',
    },
    {
      title: '🎤 Practice Modes',
      description: 'Choose from vocabulary learning or PTE-specific practice',
      features: [
        '📚 Vocabulary: Learn words with IPA pronunciation',
        '🗣️ Repeat Sentence (RS): 620 practice sentences',
        '❓ Answer Short Question (ASQ): 692 questions',
        '✍️ Write From Dictation (WFD): 1,195 sentences',
      ],
      cta: 'Next',
    },
    {
      title: '🤖 AI Features (100% FREE)',
      description: 'Powered by Google Gemini - no credit card needed!',
      features: [
        '💬 AI Tutor Chat: Get instant pronunciation help',
        '🎯 Pronunciation Scoring: Record & get AI feedback',
        '📊 Smart Recommendations: Personalized learning paths',
        '🔑 Setup: Get free API key at aistudio.google.com/apikey',
      ],
      icon: <ChatBubbleIcon width="48" height="48" className="text-violet-400" />,
      cta: 'Next',
    },
    {
      title: '🎧 Audio Features',
      description: 'Listen and practice with high-quality voices',
      features: [
        '🔊 Free Browser TTS: Built into all browsers',
        '⭐ Premium AWS Polly: Natural neural voices (optional)',
        '🇬🇧 🇺🇸 British & American accents',
        '⚡ Adjustable speed, auto-play, repeat modes',
      ],
      icon: <SpeakerLoudIcon width="48" height="48" className="text-blue-400" />,
      cta: 'Next',
    },
    {
      title: '🚀 Quick Start Guide',
      description: 'Start practicing in 3 easy steps',
      features: [
        '1️⃣ Select a vocabulary book or practice mode',
        '2️⃣ Click PLAY (▶️) to hear pronunciation',
        '3️⃣ Click AI Tutor (💬) for help anytime',
        '💡 Tip: Click "Voice Options" to choose premium voices',
      ],
      icon: <PlayIcon width="48" height="48" className="text-green-400" />,
      cta: 'Start Practicing!',
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Safety check (should never happen, but TypeScript requires it)
  if (!currentStepData) {
    return null;
  }

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in p-4"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <Card size="4" className="w-full max-w-2xl max-h-[95vh] sm:max-h-auto overflow-y-auto">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <ReaderIcon width="24" height="24" className="text-violet-400" />
              <Text size="2" color="gray">
                Step {currentStep + 1} of {steps.length}
              </Text>
            </Flex>
            <Button variant="ghost" onClick={handleSkip} title="Skip tutorial">
              <Cross2Icon width="20" height="20" />
            </Button>
          </Flex>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--gray-a3)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--accent-9)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Icon (if present) */}
          {currentStepData.icon && (
            <Flex justify="center" py="3">
              {currentStepData.icon}
            </Flex>
          )}

          {/* Content */}
          <Flex direction="column" gap="3" py="2">
            <Text size="7" weight="bold" className="text-center">
              {currentStepData.title}
            </Text>
            <Text size="3" color="gray" className="text-center">
              {currentStepData.description}
            </Text>

            {/* Features list */}
            <Flex direction="column" gap="2" mt="3">
              {currentStepData.features.map((feature, idx) => (
                <Flex
                  key={idx}
                  align="center"
                  gap="3"
                  p="3"
                  style={{
                    backgroundColor: 'var(--gray-a2)',
                    borderRadius: 'var(--radius-2)',
                    borderLeft: '3px solid var(--accent-9)',
                  }}
                >
                  <Text size="3">{feature}</Text>
                </Flex>
              ))}
            </Flex>
          </Flex>

          {/* Navigation */}
          <Flex justify="between" align="center" pt="3" style={{ borderTop: '1px solid var(--gray-5)' }}>
            <Button
              variant="soft"
              onClick={handlePrev}
              disabled={isFirstStep}
              style={{ visibility: isFirstStep ? 'hidden' : 'visible' }}
            >
              <ChevronLeftIcon width="16" height="16" />
              Previous
            </Button>

            <Flex gap="1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: idx === currentStep ? 'var(--accent-9)' : 'var(--gray-a5)',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              ))}
            </Flex>

            <Button onClick={handleNext} size="3">
              {currentStepData.cta}
              {!isLastStep && <ChevronRightIcon width="16" height="16" />}
            </Button>
          </Flex>

          {/* Skip button */}
          {!isLastStep && (
            <Flex justify="center">
              <Button variant="ghost" size="1" onClick={handleSkip}>
                <Text size="1" color="gray">
                  Skip tutorial
                </Text>
              </Button>
            </Flex>
          )}
        </Flex>
      </Card>
    </div>
  );
};

// Hook to check if onboarding should be shown
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompletedOnboarding) {
      // Delay showing onboarding slightly for better UX (from config)
      setTimeout(() => setShowOnboarding(true), appConfig.get('delays.onboardingDelay'));
    }
  }, []);

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, closeOnboarding };
};

export default OnboardingModal;
