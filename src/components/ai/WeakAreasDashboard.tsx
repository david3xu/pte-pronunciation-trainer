/**
 * Weak Areas Dashboard Component
 *
 * Displays detected weak areas with severity, examples, and suggested actions.
 * Integrated with AI-powered pattern detection and recommendation engine.
 *
 * Phase 3: Weak Area Detection
 */

import { CheckIcon, Cross2Icon, InfoCircledIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import React, { useEffect, useState } from 'react';
import { generateRecommendations, getRecommendations, updateRecommendationStatus, type Recommendation } from '../../services/ai/recommendationEngine';
import { detectWeakAreas, getWeakAreas, type WeakArea } from '../../services/ai/weakAreaDetector';
import { useAppStore } from '../../ts/stores';
import { Badge, Button, Card, Flex, Separator, Text } from '@radix-ui/themes';

interface WeakAreasDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeakAreasDashboard: React.FC<WeakAreasDashboardProps> = ({ isOpen, onClose }) => {
  const { auth } = useAppStore();
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (isOpen && auth.user?.id) {
      loadDashboardData();
    }
  }, [isOpen, auth.user?.id]);

  const loadDashboardData = async () => {
    if (!auth.user?.id) return;

    setIsLoading(true);
    try {
      // Load weak areas
      const areas = await getWeakAreas(auth.user.id);
      setWeakAreas(areas);

      // Load recommendations
      const recs = await getRecommendations(auth.user.id, 'pending');
      setRecommendations(recs);
    } catch (error) {
      console.error('[WeakAreasDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeNow = async () => {
    if (!auth.user?.id) return;

    setIsAnalyzing(true);
    try {
      // Run pattern detection
      await detectWeakAreas(auth.user.id);

      // Generate fresh recommendations
      await generateRecommendations({
        userId: auth.user.id,
        goalScore: 79, // Default, should fetch from profile
        studyHoursWeek: 10,
      });

      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error('[WeakAreasDashboard] Error analyzing:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptRecommendation = async (recId: string) => {
    await updateRecommendationStatus(recId, 'accepted');
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === recId ? { ...rec, status: 'accepted' } : rec))
    );
  };

  const handleDeclineRecommendation = async (recId: string) => {
    await updateRecommendationStatus(recId, 'declined');
    setRecommendations((prev) => prev.filter((rec) => rec.id !== recId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
      <Card size="4" className="w-full max-w-5xl h-[90vh]" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <LightningBoltIcon width="24" height="24" />
            <Text size="6" weight="bold">
              AI Insights & Recommendations
            </Text>
          </Flex>
          <Flex gap="2">
            <Button
              variant="soft"
              onClick={handleAnalyzeNow}
              disabled={isAnalyzing || !auth.isAuthenticated}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Now'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <Cross2Icon width="20" height="20" />
            </Button>
          </Flex>
        </Flex>

        {!auth.isAuthenticated ? (
          <Flex direction="column" align="center" justify="center" style={{ flex: 1 }} gap="3">
            <InfoCircledIcon width="48" height="48" />
            <Text size="4">
              Sign in to see your personalized weak areas and recommendations
            </Text>
          </Flex>
        ) : isLoading ? (
          <Flex direction="column" align="center" justify="center" style={{ flex: 1 }} gap="3">
            <Text size="4">
              Loading your insights...
            </Text>
          </Flex>
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <Flex direction="column" gap="4">
              {/* Recommendations Section */}
              {recommendations.length > 0 && (
                <div>
                  <Text size="5" weight="bold" mb="3">
                    📋 Personalized Recommendations ({recommendations.length})
                  </Text>
                  <Flex direction="column" gap="3">
                    {recommendations.map((rec) => (
                      <Card key={rec.id} size="2">
                        <Flex direction="column" gap="2">
                          <Flex justify="between" align="start">
                            <Flex direction="column" gap="1" style={{ flex: 1 }}>
                              <Flex align="center" gap="2">
                                <Badge
                                  color={
                                    rec.priority === 'urgent'
                                      ? 'red'
                                      : rec.priority === 'high'
                                      ? 'orange'
                                      : rec.priority === 'medium'
                                      ? 'yellow'
                                      : 'gray'
                                  }
                                >
                                  {rec.priority.toUpperCase()}
                                </Badge>
                                <Badge variant="soft">{rec.type.replace('_', ' ')}</Badge>
                                {rec.task_type && (
                                  <Badge>{rec.task_type.toUpperCase()}</Badge>
                                )}
                              </Flex>
                              <Text size="4" weight="bold">
                                {rec.title}
                              </Text>
                              <Text size="2">
                                {rec.description}
                              </Text>
                            </Flex>
                            <Flex gap="2">
                              <Button
                                size="1"
                                variant="soft"

                                onClick={() => handleAcceptRecommendation(rec.id!)}
                              >
                                <CheckIcon />
                              </Button>
                              <Button
                                size="1"
                                variant="ghost"

                                onClick={() => handleDeclineRecommendation(rec.id!)}
                              >
                                <Cross2Icon />
                              </Button>
                            </Flex>
                          </Flex>

                          <Text size="1" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                            💡 {rec.reasoning}
                          </Text>

                          {rec.action_items && rec.action_items.length > 0 && (
                            <div>
                              <Text size="2" weight="bold">
                                Action Items:
                              </Text>
                              <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                                {rec.action_items.map((item, idx) => (
                                  <li key={idx}>
                                    <Text size="2">{item}</Text>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <Flex justify="between" align="center">
                            <Text size="1">
                              ⏱️ Est. {rec.estimated_time_min} min
                            </Text>
                            <Text size="1">
                              Confidence: {rec.confidence}%
                            </Text>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </div>
              )}

              {/* Separator */}
              {recommendations.length > 0 && weakAreas.length > 0 && <Separator />}

              {/* Weak Areas Section */}
              {weakAreas.length > 0 && (
                <div>
                  <Text size="5" weight="bold" mb="3">
                    ⚠️ Detected Weak Areas ({weakAreas.length})
                  </Text>
                  <Flex direction="column" gap="3">
                    {weakAreas.map((area, idx) => (
                      <Card key={idx} size="2">
                        <Flex direction="column" gap="3">
                          <Flex justify="between" align="start">
                            <Flex direction="column" gap="1" style={{ flex: 1 }}>
                              <Flex align="center" gap="2">
                                <Badge color={area.task_type === 'rs' ? 'blue' : area.task_type === 'wfd' ? 'green' : 'violet'}>
                                  {area.task_type?.toUpperCase()}
                                </Badge>
                                <Badge variant="soft">{area.area_type}</Badge>
                                <Badge
                                  color={
                                    area.improvement_trend === 'improving'
                                      ? 'green'
                                      : area.improvement_trend === 'worsening'
                                      ? 'red'
                                      : area.improvement_trend === 'new'
                                      ? 'orange'
                                      : 'gray'
                                  }
                                >
                                  {area.improvement_trend}
                                </Badge>
                              </Flex>
                              <Text size="4" weight="bold">
                                {area.area_name}
                              </Text>
                              <Text size="2">
                                {area.error_count} errors detected
                              </Text>
                            </Flex>
                            <Flex direction="column" align="end" gap="1">
                              <Text size="1" weight="bold" color={area.severity >= 7 ? 'red' : area.severity >= 4 ? 'orange' : 'yellow'}>
                                Severity: {area.severity}/10
                              </Text>
                              <div className="w-full bg-app-border rounded-full h-2"

                                color={area.severity >= 7 ? 'red' : area.severity >= 4 ? 'orange' : 'yellow'}
                                style={{ width: '100px' }}
                              />
                            </Flex>
                          </Flex>

                          {area.examples && area.examples.length > 0 && (
                            <div>
                              <Text size="2" weight="bold">
                                Examples:
                              </Text>
                              <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                                {area.examples.slice(0, 3).map((example, idx) => (
                                  <li key={idx}>
                                    <Text size="2" style={{ fontFamily: 'monospace' }}>
                                      {example}
                                    </Text>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {area.suggested_actions && area.suggested_actions.length > 0 && (
                            <div>
                              <Text size="2" weight="bold">
                                Suggested Actions:
                              </Text>
                              <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                                {area.suggested_actions.map((action, idx) => (
                                  <li key={idx}>
                                    <Text size="2">{action}</Text>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </div>
              )}

              {/* Empty State */}
              {weakAreas.length === 0 && recommendations.length === 0 && (
                <Flex direction="column" align="center" justify="center" gap="3" py="8">
                  <LightningBoltIcon width="48" height="48" />
                  <Text size="4">
                    No insights yet - practice more to get personalized recommendations!
                  </Text>
                  <Button onClick={handleAnalyzeNow} disabled={isAnalyzing}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze My Progress'}
                  </Button>
                </Flex>
              )}
            </Flex>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WeakAreasDashboard;
