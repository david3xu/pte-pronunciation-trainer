/**
 * Progress Dashboard Component
 *
 * Comprehensive progress tracking with:
 * - Historical session data with charts
 * - Accuracy trends over time
 * - Category/task type breakdown
 * - Weak area analysis and visualizations
 * - Achievement tracking
 *
 * Phase 5: UI Redesign (Tasks 5 & 6)
 */

import React, { useEffect, useState } from 'react';
import { Card, Flex, Text, Badge, Progress, Separator, Tabs, ScrollArea, Button } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  TimerIcon,
  TargetIcon,
  BarChartIcon,
  LightningBoltIcon,
  CalendarIcon,
  StarFilledIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from '../../ts/stores';
import supabase from '../../services/supabase/client';
import type { TaskType } from '../../types/database';

interface SessionSummary {
  date: string;
  totalSessions: number;
  totalItems: number;
  avgAccuracy: number;
  totalMinutes: number;
}

interface CategoryStats {
  category: string;
  itemsAttempted: number;
  accuracy: number;
  avgTimePerItem: number;
}

interface WeakArea {
  category: string;
  taskType: TaskType;
  accuracy: number;
  itemsAttempted: number;
  commonErrors: string[];
}

const ProgressDashboard: React.FC = () => {
  const { progress, auth } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalSessions: 0,
    totalItems: 0,
    totalMinutes: 0,
    overallAccuracy: 0,
  });

  // Fetch historical data from Supabase
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      setIsLoading(false);
      return;
    }

    fetchProgressData();
  }, [auth.isAuthenticated, auth.user?.id]);

  const fetchProgressData = async () => {
    if (!auth.user?.id) return;

    setIsLoading(true);

    try {
      // Fetch sessions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', auth.user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch session items for detailed analysis
      const { data: items, error: itemsError } = await supabase
        .from('session_items')
        .select('*')
        .in('session_id', sessions?.map(s => s.id) || []);

      if (itemsError) throw itemsError;

      // Process data
      processSessionHistory(sessions || []);
      processCategoryStats(items || []);
      processWeakAreas(items || []);
      calculateTotalStats(sessions || [], items || []);
    } catch (error) {
      console.error('[ProgressDashboard] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processSessionHistory = (sessions: any[]) => {
    // Group by date
    const dateMap = new Map<string, SessionSummary>();

    sessions.forEach((session) => {
      const date = new Date(session.created_at).toLocaleDateString();
      const existing = dateMap.get(date);

      if (existing) {
        existing.totalSessions += 1;
        existing.totalItems += session.items_completed || 0;
        existing.totalMinutes += session.duration_minutes || 0;
        // Update average accuracy
        const totalAccuracy = (existing.avgAccuracy * (existing.totalSessions - 1)) + (session.accuracy_percent || 0);
        existing.avgAccuracy = totalAccuracy / existing.totalSessions;
      } else {
        dateMap.set(date, {
          date,
          totalSessions: 1,
          totalItems: session.items_completed || 0,
          avgAccuracy: session.accuracy_percent || 0,
          totalMinutes: session.duration_minutes || 0,
        });
      }
    });

    setSessionHistory(Array.from(dateMap.values()));
  };

  const processCategoryStats = (items: any[]) => {
    // Group by category/book
    const categoryMap = new Map<string, { total: number; correct: number; totalTime: number }>();

    items.forEach((item) => {
      const category = item.metadata?.category || 'Unknown';
      const existing = categoryMap.get(category);

      const isCorrect = item.accuracy_percent ? item.accuracy_percent >= 80 : false;

      if (existing) {
        existing.total += 1;
        existing.correct += isCorrect ? 1 : 0;
        existing.totalTime += item.time_spent_sec || 0;
      } else {
        categoryMap.set(category, {
          total: 1,
          correct: isCorrect ? 1 : 0,
          totalTime: item.time_spent_sec || 0,
        });
      }
    });

    const stats: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      itemsAttempted: data.total,
      accuracy: (data.correct / data.total) * 100,
      avgTimePerItem: data.totalTime / data.total,
    }));

    // Sort by items attempted
    stats.sort((a, b) => b.itemsAttempted - a.itemsAttempted);

    setCategoryStats(stats);
  };

  const processWeakAreas = (items: any[]) => {
    // Find areas with low accuracy (< 70%)
    const weakMap = new Map<string, { taskType: TaskType; total: number; correct: number }>();

    items.forEach((item) => {
      const category = item.metadata?.category || 'Unknown';
      const taskType = item.item_type || 'vocabulary';
      const key = `${category}-${taskType}`;
      const isCorrect = item.accuracy_percent ? item.accuracy_percent >= 80 : false;

      const existing = weakMap.get(key);

      if (existing) {
        existing.total += 1;
        existing.correct += isCorrect ? 1 : 0;
      } else {
        weakMap.set(key, {
          taskType,
          total: 1,
          correct: isCorrect ? 1 : 0,
        });
      }
    });

    const weak: WeakArea[] = Array.from(weakMap.entries())
      .map(([key, data]) => {
        const [category, taskType] = key.split('-');
        const accuracy = (data.correct / data.total) * 100;
        return {
          category: category || 'Unknown',
          taskType: taskType as TaskType,
          accuracy,
          itemsAttempted: data.total,
          commonErrors: [], // TODO: Implement error pattern analysis
        };
      })
      .filter((area) => area.accuracy < 70 && area.itemsAttempted >= 5)
      .sort((a, b) => a.accuracy - b.accuracy);

    setWeakAreas(weak);
  };

  const calculateTotalStats = (sessions: any[], items: any[]) => {
    const totalSessions = sessions.length;
    const totalItems = items.length;
    const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const correctItems = items.filter((i: any) => i.accuracy_percent && i.accuracy_percent >= 80).length;
    const overallAccuracy = totalItems > 0 ? (correctItems / totalItems) * 100 : 0;

    setTotalStats({
      totalSessions,
      totalItems,
      totalMinutes,
      overallAccuracy,
    });
  };

  // Current session stats
  const sessionDurationMinutes = progress.sessionStartTime
    ? Math.floor((Date.now() - progress.sessionStartTime) / 60000)
    : Math.floor(progress.sessionDuration / 60000);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!auth.isAuthenticated) {
    return (
      <Card size="3">
        <Flex direction="column" gap="4" align="center" p="6">
          <Text size="4" weight="bold">Sign In to Track Progress</Text>
          <Text size="2" color="gray" style={{ textAlign: 'center' }}>
            Create an account to track your progress over time, see detailed analytics, and identify areas for improvement.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {/* Header with Refresh */}
      <Flex justify="between" align="center">
        <Text size="5" weight="bold">Progress Dashboard</Text>
        <Button
          variant="soft"
          size="2"
          onClick={fetchProgressData}
          disabled={isLoading}
        >
          {isLoading ? <ReloadIcon className="animate-spin" /> : <ReloadIcon />}
          Refresh
        </Button>
      </Flex>

      {/* Overall Stats Cards */}
      <Flex gap="3" wrap="wrap">
        <Card style={{ flex: 1, minWidth: '200px' }}>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CalendarIcon width="20" height="20" color="blue" />
              <Text size="2" color="gray">Total Sessions</Text>
            </Flex>
            <Text size="6" weight="bold">{totalStats.totalSessions}</Text>
          </Flex>
        </Card>
        <Card style={{ flex: 1, minWidth: '200px' }}>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CheckCircledIcon width="20" height="20" color="green" />
              <Text size="2" color="gray">Total Items</Text>
            </Flex>
            <Text size="6" weight="bold">{totalStats.totalItems}</Text>
          </Flex>
        </Card>
        <Card style={{ flex: 1, minWidth: '200px' }}>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <TimerIcon width="20" height="20" color="purple" />
              <Text size="2" color="gray">Practice Time</Text>
            </Flex>
            <Text size="6" weight="bold">{formatTime(totalStats.totalMinutes)}</Text>
          </Flex>
        </Card>
        <Card style={{ flex: 1, minWidth: '200px' }}>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <TargetIcon width="20" height="20" color="orange" />
              <Text size="2" color="gray">Overall Accuracy</Text>
            </Flex>
            <Text size="6" weight="bold">{totalStats.overallAccuracy.toFixed(0)}%</Text>
          </Flex>
        </Card>
      </Flex>

      {/* Tabs for different views */}
      <Tabs.Root defaultValue="current">
        <Tabs.List>
          <Tabs.Trigger value="current">Current Session</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
          <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
          <Tabs.Trigger value="weak">Weak Areas</Tabs.Trigger>
        </Tabs.List>

        {/* Current Session Tab */}
        <Tabs.Content value="current">
          <Card>
            <Flex direction="column" gap="4">
              <Text size="4" weight="bold">Current Session</Text>

              {/* Accuracy */}
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="3" weight="medium">Accuracy</Text>
                  <Badge
                    size="2"
                    color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}
                  >
                    {progress.accuracy.toFixed(0)}%
                  </Badge>
                </Flex>
                <Progress
                  value={progress.accuracy}
                  max={100}
                  color={progress.accuracy >= 80 ? 'green' : progress.accuracy >= 60 ? 'blue' : 'red'}
                />
              </Flex>

              <Separator size="4" />

              {/* Session Stats Grid */}
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <CheckCircledIcon width="16" height="16" />
                    <Text size="2">Items Completed</Text>
                  </Flex>
                  <Badge color="green">{progress.itemsCompleted}</Badge>
                </Flex>

                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <TargetIcon width="16" height="16" />
                    <Text size="2">Items Correct</Text>
                  </Flex>
                  <Badge color="blue">{progress.itemsCorrect}</Badge>
                </Flex>

                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <TimerIcon width="16" height="16" />
                    <Text size="2">Session Time</Text>
                  </Flex>
                  <Badge color="purple">{formatTime(sessionDurationMinutes)}</Badge>
                </Flex>

                <Flex justify="between" align="center">
                  <Text size="2">Progress</Text>
                  <Text size="2" color="gray">
                    {progress.currentIndex + 1} / {progress.totalItems}
                  </Text>
                </Flex>
              </Flex>

              {/* Achievements */}
              <Separator size="4" />
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <StarFilledIcon width="16" height="16" color="gold" />
                  <Text size="2" weight="medium">Session Achievements</Text>
                </Flex>
                <Flex gap="1" wrap="wrap">
                  {progress.itemsCompleted >= 10 && <Badge color="green">10+ Items 🎯</Badge>}
                  {progress.accuracy >= 90 && <Badge color="green">90%+ Accuracy ⭐</Badge>}
                  {progress.itemsCompleted >= 25 && <Badge color="blue">25+ Items 🏆</Badge>}
                  {progress.itemsCompleted === 0 && <Badge color="gray">No items yet</Badge>}
                </Flex>
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>

        {/* History Tab */}
        <Tabs.Content value="history">
          <Card>
            <Flex direction="column" gap="4">
              <Text size="4" weight="bold">Session History (Last 30 Days)</Text>

              {isLoading ? (
                <Flex justify="center" p="6">
                  <ReloadIcon className="animate-spin" width="24" height="24" />
                </Flex>
              ) : sessionHistory.length === 0 ? (
                <Text size="2" color="gray">No session history yet. Start practicing!</Text>
              ) : (
                <ScrollArea style={{ maxHeight: '400px' }}>
                  <Flex direction="column" gap="2">
                    {sessionHistory.map((day, idx) => (
                      <Card key={idx} variant="surface">
                        <Flex justify="between" align="center">
                          <Flex direction="column" gap="1">
                            <Text size="2" weight="bold">{day.date}</Text>
                            <Flex gap="2">
                              <Text size="1" color="gray">{day.totalSessions} sessions</Text>
                              <Text size="1" color="gray">•</Text>
                              <Text size="1" color="gray">{day.totalItems} items</Text>
                              <Text size="1" color="gray">•</Text>
                              <Text size="1" color="gray">{formatTime(day.totalMinutes)}</Text>
                            </Flex>
                          </Flex>
                          <Badge
                            color={day.avgAccuracy >= 80 ? 'green' : day.avgAccuracy >= 60 ? 'yellow' : 'red'}
                          >
                            {day.avgAccuracy.toFixed(0)}%
                          </Badge>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </ScrollArea>
              )}
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Categories Tab */}
        <Tabs.Content value="categories">
          <Card>
            <Flex direction="column" gap="4">
              <Flex align="center" gap="2">
                <BarChartIcon width="20" height="20" color="blue" />
                <Text size="4" weight="bold">Performance by Category</Text>
              </Flex>

              {isLoading ? (
                <Flex justify="center" p="6">
                  <ReloadIcon className="animate-spin" width="24" height="24" />
                </Flex>
              ) : categoryStats.length === 0 ? (
                <Text size="2" color="gray">No category data yet. Start practicing!</Text>
              ) : (
                <ScrollArea style={{ maxHeight: '400px' }}>
                  <Flex direction="column" gap="3">
                    {categoryStats.map((stat, idx) => (
                      <Card key={idx} variant="surface">
                        <Flex direction="column" gap="2">
                          <Flex justify="between" align="center">
                            <Text size="2" weight="bold">
                              {stat.category.replace('pte-', '').toUpperCase()}
                            </Text>
                            <Badge
                              color={stat.accuracy >= 80 ? 'green' : stat.accuracy >= 60 ? 'yellow' : 'red'}
                            >
                              {stat.accuracy.toFixed(0)}%
                            </Badge>
                          </Flex>
                          <Progress value={stat.accuracy} max={100} color={stat.accuracy >= 80 ? 'green' : stat.accuracy >= 60 ? 'yellow' : 'red'} />
                          <Flex gap="2">
                            <Text size="1" color="gray">{stat.itemsAttempted} items</Text>
                            <Text size="1" color="gray">•</Text>
                            <Text size="1" color="gray">{stat.avgTimePerItem.toFixed(0)}s avg</Text>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </ScrollArea>
              )}
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Weak Areas Tab */}
        <Tabs.Content value="weak">
          <Card>
            <Flex direction="column" gap="4">
              <Flex align="center" gap="2">
                <LightningBoltIcon width="20" height="20" color="orange" />
                <Text size="4" weight="bold">Areas for Improvement</Text>
              </Flex>

              {isLoading ? (
                <Flex justify="center" p="6">
                  <ReloadIcon className="animate-spin" width="24" height="24" />
                </Flex>
              ) : weakAreas.length === 0 ? (
                <Flex direction="column" gap="2" align="center" p="4">
                  <Text size="3" weight="bold" color="green">🎉 Great job!</Text>
                  <Text size="2" color="gray" style={{ textAlign: 'center' }}>
                    No weak areas detected. You're performing well across all categories!
                  </Text>
                </Flex>
              ) : (
                <Flex direction="column" gap="3">
                  <Text size="2" color="gray">
                    These areas have accuracy below 70% (minimum 5 items attempted):
                  </Text>
                  <ScrollArea style={{ maxHeight: '400px' }}>
                    <Flex direction="column" gap="3">
                      {weakAreas.map((area, idx) => (
                        <Card key={idx} variant="surface" style={{ borderLeft: '3px solid var(--red-9)' }}>
                          <Flex direction="column" gap="2">
                            <Flex justify="between" align="center">
                              <Flex direction="column" gap="1">
                                <Text size="2" weight="bold">
                                  {area.category.replace('pte-', '').toUpperCase()}
                                </Text>
                                <Badge size="1" variant="soft">{area.taskType}</Badge>
                              </Flex>
                              <Badge color="red" size="2">
                                {area.accuracy.toFixed(0)}%
                              </Badge>
                            </Flex>
                            <Progress value={area.accuracy} max={100} color="red" />
                            <Text size="1" color="gray">{area.itemsAttempted} items attempted</Text>

                            {/* Recommendations */}
                            <Card size="1" variant="classic" style={{ backgroundColor: 'var(--orange-2)' }}>
                              <Text size="1">
                                💡 <strong>Tip:</strong> Focus on this area during your next practice session. Use the AI Tutor for guidance.
                              </Text>
                            </Card>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </ScrollArea>
                </Flex>
              )}
            </Flex>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Flex>
  );
};

export default ProgressDashboard;
