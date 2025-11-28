/**
 * ProgressTracker Component
 *
 * Displays user progress, accuracy, streak, and session statistics.
 */

import { CheckCircledIcon, TargetIcon, TimerIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useAppStore } from '../../ts/stores';
import { Badge, Card, Flex, Text } from '@radix-ui/themes';

const ProgressTracker: React.FC = () => {
  const { progress, auth } = useAppStore();

  // Calculate session duration in minutes
  const sessionDurationMinutes = progress.sessionStartTime
    ? Math.floor((Date.now() - progress.sessionStartTime) / 60000)
    : Math.floor(progress.sessionDuration / 60000);

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Text size="4" weight="bold">Your Progress</Text>

        {/* Accuracy */}
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Text size="3" weight="medium">Accuracy</Text>
            <Badge
              size="2"
              color={
                progress.accuracy >= 80 ? 'green' :
                progress.accuracy >= 60 ? 'blue' :
                'red'
              }
            >
              {progress.accuracy.toFixed(0)}%
            </Badge>
          </Flex>
          <div className="w-full bg-app-border rounded-full h-2"


            color={
              progress.accuracy >= 80 ? 'green' :
              progress.accuracy >= 60 ? 'blue' :
              'red'
            }
          />
        </Flex>

        {/* Session Stats */}
        <Flex direction="column" gap="3">
          {/* Items Completed */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <CheckCircledIcon width="16" height="16" className="text-green-500" />
              <Text size="2">Items Completed</Text>
            </Flex>
            <Badge>{progress.itemsCompleted}</Badge>
          </Flex>

          {/* Items Correct */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <TargetIcon width="16" height="16" className="text-blue-500" />
              <Text size="2">Items Correct</Text>
            </Flex>
            <Badge>{progress.itemsCorrect}</Badge>
          </Flex>

          {/* Session Duration */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <TimerIcon width="16" height="16" className="text-purple-500" />
              <Text size="2">Session Time</Text>
            </Flex>
            <Badge>{formatTime(sessionDurationMinutes)}</Badge>
          </Flex>

          {/* Current Progress */}
          <Flex justify="between" align="center">
            <Text size="2">Current Item</Text>
            <Text size="2">
              {progress.currentIndex + 1} / {progress.totalItems}
            </Text>
          </Flex>
        </Flex>

        {/* Achievement Badges (if authenticated) */}
        {auth.isAuthenticated && (
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">Achievements</Text>
            <Flex gap="1" wrap="wrap">
              {progress.itemsCompleted >= 10 && (
                <Badge>10+ Items 🎯</Badge>
              )}
              {progress.accuracy >= 90 && (
                <Badge>90%+ Accuracy ⭐</Badge>
              )}
              {progress.itemsCompleted >= 50 && (
                <Badge>50+ Items 🏆</Badge>
              )}
              {progress.itemsCompleted >= 100 && (
                <Badge>100+ Items 👑</Badge>
              )}
            </Flex>
          </Flex>
        )}

        {/* Motivational Message */}
        <Flex
          p="3"
          style={{
            backgroundColor: 'var(--accent-3)',
            borderRadius: 'var(--radius-3)',
          }}
        >
          <Text size="2" className="text-center">
            {progress.accuracy >= 90
              ? '🌟 Excellent work! You\'re doing great!'
              : progress.accuracy >= 75
              ? '💪 Good progress! Keep it up!'
              : progress.accuracy >= 60
              ? '📈 You\'re improving! Practice makes perfect.'
              : progress.itemsCompleted === 0
              ? '🚀 Start practicing to see your progress!'
              : '💡 Keep practicing! You\'ll get there.'}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default ProgressTracker;
