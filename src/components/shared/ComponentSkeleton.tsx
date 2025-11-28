/**
 * Component Loading Skeleton
 *
 * Displayed while lazy-loaded components are being fetched.
 */

import React from 'react';
import { Card, Flex } from '@radix-ui/themes';

export const ComponentSkeleton: React.FC = () => {
  return (
    <Card>
      <Flex direction="column" gap="4">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-700/50 rounded-lg animate-pulse" />

        {/* Main content skeleton */}
        <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />

        {/* Controls skeleton */}
        <Flex gap="2">
          <div className="h-12 flex-1 bg-gray-700/40 rounded-md animate-pulse" />
          <div className="h-12 flex-1 bg-gray-700/40 rounded-md animate-pulse" />
        </Flex>
      </Flex>
    </Card>
  );
};
