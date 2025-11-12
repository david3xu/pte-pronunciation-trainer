/**
 * Skeleton Component
 *
 * Reusable skeleton loading placeholders for better UX during data loading.
 */

import React from 'react';
import { Flex, Card } from '@radix-ui/themes';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-2)',
  className = '',
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--gray-a3)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
  );
};

// Skeleton for WordCard
export const WordCardSkeleton: React.FC = () => {
  return (
    <Card size="4" className="word-card">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex gap="2">
            <Skeleton width="60px" height="24px" />
            <Skeleton width="80px" height="24px" />
          </Flex>
          <Skeleton width="100px" height="24px" />
        </Flex>

        {/* Word */}
        <Skeleton width="70%" height="48px" />

        {/* Pronunciation rows */}
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="2">
            <Skeleton width="80px" height="16px" />
            <Flex align="center" gap="2">
              <Skeleton width="200px" height="28px" />
              <Skeleton width="40px" height="28px" />
            </Flex>
            <Skeleton width="60%" height="20px" />
          </Flex>

          <Flex direction="column" gap="2">
            <Skeleton width="80px" height="16px" />
            <Flex align="center" gap="2">
              <Skeleton width="200px" height="28px" />
              <Skeleton width="40px" height="28px" />
            </Flex>
            <Skeleton width="60%" height="20px" />
          </Flex>
        </Flex>

        {/* Definition */}
        <Flex direction="column" gap="2">
          <Skeleton width="80px" height="16px" />
          <Skeleton width="100%" height="20px" />
          <Skeleton width="90%" height="20px" />
        </Flex>
      </Flex>
    </Card>
  );
};

// Skeleton for VocabularyList item
export const VocabularyListItemSkeleton: React.FC = () => {
  return (
    <Flex
      p="3"
      gap="2"
      align="center"
      style={{
        borderRadius: 'var(--radius-2)',
        backgroundColor: 'var(--gray-a2)',
      }}
    >
      <Skeleton width="100%" height="24px" />
      <Skeleton width="50px" height="20px" />
    </Flex>
  );
};

// Skeleton for entire VocabularyList
export const VocabularyListSkeleton: React.FC = () => {
  return (
    <Flex direction="column" gap="2">
      {[...Array(8)].map((_, i) => (
        <VocabularyListItemSkeleton key={i} />
      ))}
    </Flex>
  );
};

// Add CSS for skeleton animation (should be in global styles)
const skeletonStyles = `
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'skeleton-styles';
  styleTag.textContent = skeletonStyles;
  document.head.appendChild(styleTag);
}

export default Skeleton;
