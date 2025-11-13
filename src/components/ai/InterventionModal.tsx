/**
 * Intervention Modal Component
 *
 * Displays proactive AI interventions during practice sessions.
 * Shows help offers, break reminders, mastery level-ups, and difficulty suggestions.
 *
 * Phase 4: Proactive AI
 */

import React from 'react';
import { Card, Flex, Text, Button, Badge } from '@radix-ui/themes';
import {
  Cross2Icon,
  LightningBoltIcon,
  RocketIcon,
  CheckCircledIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import type { Intervention } from '../../services/ai/interventionEngine';

interface InterventionModalProps {
  intervention: Intervention | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

const InterventionModal: React.FC<InterventionModalProps> = ({
  intervention,
  onAccept,
  onDecline,
  onDismiss,
}) => {
  if (!intervention) return null;

  // Get icon based on intervention type
  const getIcon = () => {
    switch (intervention.type) {
      case 'mastery_levelup':
      case 'streak_celebration':
        return <CheckCircledIcon width="32" height="32" color="green" />;
      case 'difficulty_increase':
      case 'difficulty_decrease':
        return <LightningBoltIcon width="32" height="32" color="orange" />;
      case 'help_offer':
      case 'encouragement':
        return <InfoCircledIcon width="32" height="32" color="blue" />;
      case 'break_reminder':
      case 'fatigue_warning':
        return <RocketIcon width="32" height="32" color="purple" />;
      default:
        return <InfoCircledIcon width="32" height="32" color="gray" />;
    }
  };

  // Get priority color
  const getPriorityColor = () => {
    switch (intervention.priority) {
      case 'urgent':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'gray';
      default:
        return 'blue';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
      <Card
        size="3"
        className="w-full max-w-md"
        style={{
          border: `2px solid var(--${getPriorityColor()}-9)`,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex align="center" gap="3">
              {getIcon()}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text size="5" weight="bold">
                    {intervention.title}
                  </Text>
                  <Badge color={getPriorityColor()} size="1">
                    {intervention.priority}
                  </Badge>
                </Flex>
                <Badge variant="soft" size="1">
                  {intervention.type.replace('_', ' ')}
                </Badge>
              </Flex>
            </Flex>
            <Button
              variant="ghost"
              size="1"
              onClick={onDismiss}
              style={{ opacity: 0.6 }}
            >
              <Cross2Icon />
            </Button>
          </Flex>

          {/* Message */}
          <Text size="3" style={{ lineHeight: '1.6' }}>
            {intervention.message}
          </Text>

          {/* Metadata (if present) */}
          {intervention.metadata && (
            <Flex direction="column" gap="2" p="3" style={{ backgroundColor: 'var(--gray-a2)', borderRadius: '8px' }}>
              {intervention.metadata.suggestedDifficulty && (
                <Text size="2" color="gray">
                  💡 Suggested difficulty: <strong>{intervention.metadata.suggestedDifficulty}</strong>
                </Text>
              )}
              {intervention.metadata.suggestedBreakMin && (
                <Text size="2" color="gray">
                  ⏱️ Suggested break: <strong>{intervention.metadata.suggestedBreakMin} minutes</strong>
                </Text>
              )}
              {intervention.metadata.achievementData && (
                <Text size="2" color="gray">
                  🎯 Achievement:{' '}
                  {intervention.metadata.achievementData.accuracy && (
                    <strong>{intervention.metadata.achievementData.accuracy.toFixed(0)}% accuracy</strong>
                  )}
                  {intervention.metadata.achievementData.streak && (
                    <strong>{intervention.metadata.achievementData.streak} streak</strong>
                  )}
                </Text>
              )}
            </Flex>
          )}

          {/* Actions */}
          <Flex gap="2" justify="end">
            {intervention.actions.map((action, idx) => {
              if (action.action === 'accept') {
                return (
                  <Button
                    key={idx}
                    variant="solid"
                    color={intervention.priority === 'urgent' ? 'red' : intervention.priority === 'high' ? 'orange' : 'blue'}
                    onClick={onAccept}
                  >
                    {action.label}
                  </Button>
                );
              } else if (action.action === 'decline') {
                return (
                  <Button
                    key={idx}
                    variant="soft"
                    color="gray"
                    onClick={onDecline}
                  >
                    {action.label}
                  </Button>
                );
              }
              return null;
            })}
          </Flex>
        </Flex>
      </Card>
    </div>
  );
};

export default InterventionModal;
