/**
 * AIRecommendations Component
 *
 * Displays AI-powered learning recommendations based on user progress.
 * Uses Google Gemini API (free tier) to analyze weak areas and suggest practice items.
 */

import { BookmarkIcon, LightningBoltIcon, ReloadIcon, RocketIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';
import { generateRecommendations, type Recommendation, type UserProgress } from '../../services/ai/recommendationService';
import { useAppStore } from '../../stores';

const AIRecommendations: React.FC = () => {
  const { auth, progress } = useAppStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations on mount and when progress changes
  useEffect(() => {
    if (auth.isAuthenticated && progress.totalItems > 0) {
      fetchRecommendations();
    }
  }, [auth.isAuthenticated, progress.accuracy, progress.completedItems.size]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build user progress data from Zustand store
      const userProgress: UserProgress = {
        completedItems: progress.completedItems.size,
        totalItems: progress.totalItems,
        accuracy: progress.accuracy,
        weakAreas: [], // TODO: Track weak areas in progress store
        recentActivity: [] // TODO: Track recent activity
      };

      const result = await generateRecommendations(userProgress);
      setRecommendations(result);
    } catch (err) {
      setError('❌ Failed to generate AI recommendations. Check: 1) Google Gemini API key in Settings, 2) Internet connection. Get your free key at aistudio.google.com/apikey (100% FREE, 1,500/day)');
      console.error('AI Recommendations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <Card size="3" className="ai-recommendations">
        <Flex direction="column" gap="3" align="center" py="4">
          <RocketIcon width="32" height="32" className="text-gray-400" />
          <Text size="2" color="gray" className="text-center">
            Sign in to get AI-powered learning recommendations
          </Text>
          <Text size="1" color="gray" className="text-center">
            Track your progress and receive personalized suggestions
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="3" className="ai-recommendations">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <LightningBoltIcon width="20" height="20" className="text-violet-500" />
            <Text size="4" weight="bold">
              AI Recommendations
            </Text>
          </Flex>
          <Button
            size="1"
            variant="soft"
            onClick={fetchRecommendations}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="1" /> : <ReloadIcon />}
          </Button>
        </Flex>

        {/* Accuracy indicator */}
        {progress.totalItems > 0 && (
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Current Accuracy
            </Text>
            <Flex align="center" gap="2">
              <Text
                size="6"
                weight="bold"
                color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}
              >
                {progress.accuracy.toFixed(0)}%
              </Text>
              <Badge
                color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}
                size="2"
              >
                {progress.accuracy >= 80 ? 'Excellent' : progress.accuracy >= 60 ? 'Good' : 'Needs Practice'}
              </Badge>
            </Flex>
            <Text size="1" color="gray">
              {progress.completedItems.size} / {progress.totalItems} items completed
            </Text>
          </Flex>
        )}

        {/* Loading state */}
        {isLoading && (
          <Flex justify="center" align="center" py="6" direction="column" gap="2">
            <Spinner size="3" />
            <Text size="2" color="gray">
              Analyzing your progress with AI...
            </Text>
          </Flex>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <Flex direction="column" gap="2" p="3" style={{ backgroundColor: 'var(--red-2)', borderRadius: '8px' }}>
            <Text size="2" color="red" weight="medium">
              {error}
            </Text>
            <Text size="1" color="gray">
              Showing fallback recommendations based on your progress.
            </Text>
          </Flex>
        )}

        {/* Recommendations list */}
        {!isLoading && recommendations.length > 0 && (
          <Flex direction="column" gap="3">
            <Text size="2" weight="medium" color="gray">
              Personalized for you:
            </Text>
            {recommendations.map((rec, index) => (
              <Card key={index} size="2" variant="surface" className="hover:shadow-md transition-shadow">
                <Flex direction="column" gap="3">
                  {/* Priority & Category */}
                  <Flex justify="between" align="center">
                    <Badge
                      color={
                        rec.priority === 'high' ? 'red' :
                        rec.priority === 'medium' ? 'orange' :
                        'green'
                      }
                      size="2"
                    >
                      {rec.priority.toUpperCase()} PRIORITY
                    </Badge>
                    <Badge color="violet" variant="soft" size="1">
                      {rec.type === 'vocabulary' ? <BookmarkIcon className="inline mr-1" /> : '🎯'}
                      {rec.type}
                    </Badge>
                  </Flex>

                  {/* Reason */}
                  <Text size="2" style={{ lineHeight: '1.6' }}>
                    {rec.reason}
                  </Text>

                  {/* Action */}
                  <Flex justify="between" align="center">
                    <Badge color="gray" size="1" variant="soft">
                      {rec.category.replace('pte-', '').replace('-', ' ').toUpperCase()}
                    </Badge>
                    {rec.estimatedTime && (
                      <Text size="1" color="gray">
                        ⏱️ {rec.estimatedTime}
                      </Text>
                    )}
                  </Flex>

                  {/* Specific items if available */}
                  {rec.specificItems && rec.specificItems.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {rec.specificItems.slice(0, 5).map((item, i) => (
                        <Badge key={i} color="blue" variant="soft" size="1">
                          {item}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}

        {/* Empty state */}
        {!isLoading && !error && recommendations.length === 0 && progress.totalItems > 0 && (
          <Flex direction="column" gap="2" align="center" py="4">
            <Text size="2" color="gray" className="text-center">
              Complete a few more practice items to get personalized AI recommendations.
            </Text>
            <Text size="1" color="gray" className="text-center">
              We need some data to analyze your learning patterns.
            </Text>
          </Flex>
        )}

        {/* Info */}
        <Flex justify="center" align="center" gap="1">
          <Text size="1" color="gray">
            Powered by
          </Text>
          <Badge color="violet" variant="soft" size="1">
            Google Gemini AI
          </Badge>
          <Text size="1" color="gray">
            • Free Tier
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default AIRecommendations;
