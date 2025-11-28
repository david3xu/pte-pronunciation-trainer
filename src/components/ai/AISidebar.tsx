/**
 * AI Sidebar Component
 *
 * Always-visible AI assistant sidebar that provides:
 * - Quick access to AI features (Chat, Scoring, Insights)
 * - Contextual tips and suggestions
 * - Session progress indicators
 * - Collapsible/expandable design
 *
 * Phase 5: UI Redesign
 */

import {
  ChatBubbleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LightningBoltIcon,
  QuestionMarkCircledIcon,
  RocketIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { Badge, Button, Card, Flex, Separator, Text } from '@radix-ui/themes';

interface AISidebarProps {
  onOpenChat?: () => void;
  onOpenScoring?: () => void;
  onOpenInsights?: () => void;
  sessionStats?: {
    itemsCompleted: number;
    accuracy: number;
    currentStreak: number;
  };
}

const AISidebar: React.FC<AISidebarProps> = ({
  onOpenChat,
  onOpenScoring,
  onOpenInsights,
  sessionStats,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Contextual tips based on session stats
  const getContextualTips = (): string[] => {
    if (!sessionStats) {
      return [
        'Start practicing to get personalized tips!',
        'Use the AI Tutor for pronunciation help.',
        'Record yourself for detailed feedback.',
      ];
    }

    const tips: string[] = [];

    if (sessionStats.itemsCompleted < 5) {
      tips.push('Just getting started! Keep going!');
    } else if (sessionStats.itemsCompleted >= 20) {
      tips.push('Great session! Consider taking a short break.');
    }

    if (sessionStats.accuracy >= 80) {
      tips.push('Excellent accuracy! You\'re doing great!');
    } else if (sessionStats.accuracy < 60 && sessionStats.itemsCompleted >= 5) {
      tips.push('Try using the AI Tutor for pronunciation guidance.');
    }

    if (sessionStats.currentStreak >= 5) {
      tips.push(`🔥 ${sessionStats.currentStreak} correct in a row! Keep it up!`);
    }

    // Default tips if no specific conditions met
    if (tips.length === 0) {
      tips.push('Focus on listening carefully to each word.');
      tips.push('Practice makes perfect!');
    }

    return tips;
  };

  const tips = getContextualTips();

  // Collapsed view - just icons
  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
        }}
      >
        <Card
          size="1"
          style={{
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            padding: '8px',
          }}
        >
          <Flex direction="column" gap="2" align="center" p="2">
            <Button
              variant="ghost"
              size="1"
              onClick={() => setIsCollapsed(false)}
              title="Expand AI Assistant"
            >
              <ChevronLeftIcon width="20" height="20" />
            </Button>
            <Separator />
            <Button
              variant="ghost"
              size="1"
              onClick={onOpenChat}
              title="AI Tutor Chat"
            >
              <ChatBubbleIcon width="18" height="18" />
            </Button>
            <Button
              variant="ghost"
              size="1"
              onClick={onOpenScoring}
              title="Pronunciation Scoring"
            >
              <SpeakerLoudIcon width="18" height="18" />
            </Button>
            <Button
              variant="ghost"
              size="1"
              onClick={onOpenInsights}
              title="AI Insights"
            >
              <LightningBoltIcon width="18" height="18" />
            </Button>
          </Flex>
        </Card>
      </div>
    );
  }

  // Expanded view - full sidebar
  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '320px',
        maxHeight: '80vh',
        zIndex: 40,
      }}
    >
      <Card
        size="2"
        style={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Flex direction="column" gap="3" style={{ height: '100%' }}>
          {/* Header */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <RocketIcon width="20" height="20" color="violet" />
              <Text size="3" weight="bold">
                AI Assistant
              </Text>
            </Flex>
            <Button
              variant="ghost"
              size="1"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
            >
              <ChevronRightIcon width="20" height="20" />
            </Button>
          </Flex>

          <Separator />

          {/* Session Stats */}
          {sessionStats && (
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold" color="gray">
                📊 Session Progress
              </Text>
              <Flex direction="column" gap="1">
                <Flex justify="between">
                  <Text size="2">Items:</Text>
                  <Badge>{sessionStats.itemsCompleted}</Badge>
                </Flex>
                <Flex justify="between">
                  <Text size="2">Accuracy:</Text>
                  <Badge color={sessionStats.accuracy >= 80 ? 'green' : sessionStats.accuracy >= 60 ? 'yellow' : 'red'}>
                    {sessionStats.accuracy.toFixed(0)}%
                  </Badge>
                </Flex>
                <Flex justify="between">
                  <Text size="2">Streak:</Text>
                  <Badge color={sessionStats.currentStreak >= 5 ? 'orange' : 'blue'}>
                    {sessionStats.currentStreak} 🔥
                  </Badge>
                </Flex>
              </Flex>
              <Separator />
            </Flex>
          )}

          {/* Quick Actions */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold" color="gray">
              🤖 AI Tools
            </Text>
            <Flex direction="column" gap="2">
              <Button
                variant="soft"
                size="2"
                onClick={onOpenChat}
                style={{ justifyContent: 'flex-start' }}
              >
                <ChatBubbleIcon />
                <Text size="2">Ask AI Tutor</Text>
              </Button>
              <Button
                variant="soft"
                size="2"
                onClick={onOpenScoring}
                style={{ justifyContent: 'flex-start' }}
              >
                <SpeakerLoudIcon />
                <Text size="2">Score My Pronunciation</Text>
              </Button>
              <Button
                variant="soft"
                size="2"
                onClick={onOpenInsights}
                style={{ justifyContent: 'flex-start' }}
              >
                <LightningBoltIcon />
                <Text size="2">View Insights</Text>
              </Button>
            </Flex>
          </Flex>

          <Separator />

          {/* Contextual Tips */}
          <Flex direction="column" gap="2" style={{ flex: 1, minHeight: 0 }}>
            <Flex align="center" gap="2">
              <QuestionMarkCircledIcon width="16" height="16" color="blue" />
              <Text size="2" weight="bold" color="gray">
                💡 Tips for You
              </Text>
            </Flex>
            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
              <Flex direction="column" gap="2">
                {tips.map((tip, idx) => (
                  <Card key={idx} variant="surface" size="1">
                    <Text size="2" style={{ lineHeight: '1.4' }}>
                      {tip}
                    </Text>
                  </Card>
                ))}
              </Flex>
            </div>
          </Flex>

          {/* Bottom section - Info */}
          <Separator />
          <Card variant="surface" size="1">
            <Flex direction="column" gap="1">
              <Text size="1" weight="bold" color="gray">
                Need help?
              </Text>
              <Text size="1" color="gray">
                Click "Ask AI Tutor" for personalized pronunciation guidance powered by Gemini AI (free).
              </Text>
            </Flex>
          </Card>
        </Flex>
      </Card>
    </div>
  );
};

export default AISidebar;
