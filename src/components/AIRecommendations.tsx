/**
 * AIRecommendations Component
 *
 * Displays AI-powered learning recommendations based on user progress.
 * Uses OpenAI to analyze weak areas and suggest practice items.
 */

import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Badge, Spinner } from '@radix-ui/themes';
import { LightningBoltIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useAppStore } from '../ts/stores';
import { getAIRecommendations } from '../api/ai';

interface Recommendation {
  word: string;
  reason: string;
  difficulty: 'easy' | 'normal' | 'hard';
  category: string;
}

const AIRecommendations: React.FC = () => {
  const { auth, progress, vocabulary } = useAppStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations on mount and when progress changes
  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchRecommendations();
    }
  }, [auth.isAuthenticated, progress.accuracy]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAIRecommendations({
        userId: auth.user?.id || '',
        currentAccuracy: progress.accuracy,
        completedItems: Array.from(progress.completedItems),
        currentMode: vocabulary.mode,
      });

      if (result.success && result.data) {
        setRecommendations(result.data);
      } else {
        setError(result.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setError('An error occurred while fetching recommendations');
      console.error('AI Recommendations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if not authenticated
  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <Card size="3" className="ai-recommendations">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <LightningBoltIcon width="20" height="20" className="text-accent" />
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
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Current Accuracy
          </Text>
          <Flex align="center" gap="2">
            <Text size="6" weight="bold" color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}>
              {progress.accuracy.toFixed(0)}%
            </Text>
            <Badge
              color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}
              size="2"
            >
              {progress.accuracy >= 80 ? 'Excellent' : progress.accuracy >= 60 ? 'Good' : 'Needs Practice'}
            </Badge>
          </Flex>
        </Flex>

        {/* Loading state */}
        {isLoading && (
          <Flex justify="center" align="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}

        {/* Recommendations list */}
        {!isLoading && !error && recommendations.length > 0 && (
          <Flex direction="column" gap="3">
            <Text size="2" weight="medium">
              Recommended words to practice:
            </Text>
            {recommendations.map((rec, index) => (
              <Card key={index} size="1" variant="classic">
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="3" weight="bold">
                      {rec.word}
                    </Text>
                    <Badge
                      color={
                        rec.difficulty === 'hard' ? 'red' :
                        rec.difficulty === 'normal' ? 'blue' :
                        'green'
                      }
                      size="1"
                    >
                      {rec.difficulty}
                    </Badge>
                  </Flex>
                  <Text size="2" color="gray">
                    {rec.reason}
                  </Text>
                  <Badge color="gray" size="1" variant="soft">
                    {rec.category}
                  </Badge>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}

        {/* Empty state */}
        {!isLoading && !error && recommendations.length === 0 && (
          <Text size="2" color="gray" className="text-center">
            No recommendations available. Complete more practice items to get personalized suggestions.
          </Text>
        )}

        {/* Info */}
        <Text size="1" color="gray" className="text-center">
          Powered by AI • Updates based on your progress
        </Text>
      </Flex>
    </Card>
  );
};

export default AIRecommendations;
