/**
 * Learner Profile Onboarding Modal
 *
 * First-time user onboarding to collect PTE goals and learning preferences.
 * This data powers AI-driven personalized recommendations.
 */

import React, { useState } from 'react';
import { Card, Flex, Text, Button, Select, TextField } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  RocketIcon,
  TargetIcon,
  CalendarIcon,
  LightningBoltIcon,
  ClockIcon,
} from '@radix-ui/react-icons';
import { saveLearnerProfile, type OnboardingFormData } from '../../services/profile/learnerProfileService';
import type { LearningStyle } from '../../types/database';

interface LearnerProfileModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  userId,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<OnboardingFormData>({
    pte_goal_score: 65,
    target_date: '',
    learning_style: 'mixed',
    study_hours_week: 10,
  });

  const steps = [
    {
      title: '🎯 Welcome to PTE Pronunciation Trainer!',
      description: "Let's personalize your learning journey",
      icon: <RocketIcon width="48" height="48" className="text-violet-400" />,
    },
    {
      title: '🎓 What\'s Your PTE Goal Score?',
      description: 'This helps us tailor practice difficulty',
      icon: <TargetIcon width="48" height="48" className="text-green-400" />,
    },
    {
      title: '📅 When\'s Your Exam?',
      description: 'Set a target date for focused preparation',
      icon: <CalendarIcon width="48" height="48" className="text-blue-400" />,
    },
    {
      title: '🧠 How Do You Learn Best?',
      description: 'Choose your preferred learning style',
      icon: <LightningBoltIcon width="48" height="48" className="text-yellow-400" />,
    },
    {
      title: '⏰ Study Time Commitment',
      description: 'How many hours can you study per week?',
      icon: <ClockIcon width="48" height="48" className="text-orange-400" />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Safety check
  if (!currentStepData) {
    return null;
  }

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveLearnerProfile(userId, formData);

      if (result.success) {
        console.log('[LearnerProfileModal] Profile saved successfully');
        onComplete();
      } else {
        setError(result.error || 'Failed to save profile. Please try again.');
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error('[LearnerProfileModal] Error saving profile:', err);
      setError(err.message || 'An unexpected error occurred');
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in p-4"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <Card size="4" className="w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <Flex direction="column" gap="4">
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

          {/* Step indicator */}
          <Flex justify="center" align="center" gap="2">
            <Text size="2" color="gray">
              Step {currentStep + 1} of {steps.length}
            </Text>
          </Flex>

          {/* Icon */}
          <Flex justify="center" py="3">
            {currentStepData.icon}
          </Flex>

          {/* Content */}
          <Flex direction="column" gap="3" py="2">
            <Text size="7" weight="bold" className="text-center">
              {currentStepData.title}
            </Text>
            <Text size="3" color="gray" className="text-center">
              {currentStepData.description}
            </Text>

            {/* Step-specific forms */}
            <Flex direction="column" gap="4" mt="4">
              {currentStep === 0 && (
                <Flex direction="column" gap="3">
                  <Text size="2">
                    We'll ask you a few quick questions to customize your learning experience:
                  </Text>
                  <Flex direction="column" gap="2">
                    {[
                      '🎯 Your PTE goal score',
                      '📅 Target exam date',
                      '🧠 Learning style preference',
                      '⏰ Weekly study commitment',
                    ].map((item, idx) => (
                      <Flex
                        key={idx}
                        align="center"
                        gap="2"
                        p="2"
                        style={{
                          backgroundColor: 'var(--gray-a2)',
                          borderRadius: 'var(--radius-2)',
                        }}
                      >
                        <Text size="3">{item}</Text>
                      </Flex>
                    ))}
                  </Flex>
                </Flex>
              )}

              {currentStep === 1 && (
                <Flex direction="column" gap="3">
                  <Text size="2" weight="medium">
                    Select your target PTE score (10-90):
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {[50, 58, 65, 79].map((score) => (
                      <Button
                        key={score}
                        variant={formData.pte_goal_score === score ? 'solid' : 'soft'}
                        onClick={() => setFormData({ ...formData, pte_goal_score: score })}
                      >
                        {score === 50 && '🟢 '}
                        {score === 58 && '🔵 '}
                        {score === 65 && '🟡 '}
                        {score === 79 && '🔴 '}
                        {score}+
                      </Button>
                    ))}
                  </Flex>
                  <Text size="1" color="gray">
                    💡 Tip: Most universities require 58-65. Advanced programs need 79+
                  </Text>
                </Flex>
              )}

              {currentStep === 2 && (
                <Flex direction="column" gap="3">
                  <Text size="2" weight="medium">
                    When do you plan to take the PTE exam?
                  </Text>
                  <TextField.Root
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Text size="1" color="gray">
                    💡 Having a target date helps us create a study schedule
                  </Text>
                </Flex>
              )}

              {currentStep === 3 && (
                <Flex direction="column" gap="3">
                  <Text size="2" weight="medium">
                    How do you learn best?
                  </Text>
                  <Select.Root
                    value={formData.learning_style}
                    onValueChange={(value) =>
                      setFormData({ ...formData, learning_style: value as LearningStyle })
                    }
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      <Select.Item value="visual">
                        👁️ Visual - I learn best by seeing (images, diagrams)
                      </Select.Item>
                      <Select.Item value="auditory">
                        👂 Auditory - I learn best by listening (audio, lectures)
                      </Select.Item>
                      <Select.Item value="kinesthetic">
                        ✋ Kinesthetic - I learn best by doing (practice, exercises)
                      </Select.Item>
                      <Select.Item value="mixed">
                        🌈 Mixed - I use a combination of all styles
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <Text size="1" color="gray">
                    💡 We'll adapt content presentation to match your style
                  </Text>
                </Flex>
              )}

              {currentStep === 4 && (
                <Flex direction="column" gap="3">
                  <Text size="2" weight="medium">
                    Hours per week you can dedicate to practice:
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {[5, 10, 15, 20].map((hours) => (
                      <Button
                        key={hours}
                        variant={formData.study_hours_week === hours ? 'solid' : 'soft'}
                        onClick={() => setFormData({ ...formData, study_hours_week: hours })}
                      >
                        {hours} hours
                      </Button>
                    ))}
                  </Flex>
                  <Text size="1" color="gray">
                    💡 Consistent daily practice is more effective than cramming
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>

          {/* Error message */}
          {error && (
            <Flex
              p="3"
              style={{
                backgroundColor: 'var(--red-3)',
                borderRadius: 'var(--radius-3)',
                border: '1px solid var(--red-6)',
              }}
            >
              <Text size="2" color="red">
                {error}
              </Text>
            </Flex>
          )}

          {/* Navigation */}
          <Flex justify="between" align="center" pt="3" style={{ borderTop: '1px solid var(--gray-5)' }}>
            <Button
              variant="soft"
              onClick={handlePrev}
              disabled={isFirstStep || isSaving}
              style={{ visibility: isFirstStep ? 'hidden' : 'visible' }}
            >
              ← Previous
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

            <Button onClick={handleNext} size="3" disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : isLastStep ? (
                <>
                  <CheckCircledIcon /> Complete
                </>
              ) : (
                <>
                  Next →
                </>
              )}
            </Button>
          </Flex>

          {/* Skip button */}
          {!isLastStep && onSkip && (
            <Flex justify="center">
              <Button variant="ghost" size="1" onClick={handleSkip} disabled={isSaving}>
                <Text size="1" color="gray">
                  Skip for now
                </Text>
              </Button>
            </Flex>
          )}
        </Flex>
      </Card>
    </div>
  );
};

export default LearnerProfileModal;
