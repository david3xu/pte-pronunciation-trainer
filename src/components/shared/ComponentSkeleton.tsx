/**
 * Component Loading Skeleton
 *
 * Displayed while lazy-loaded components are being fetched.
 */

import { Card, Flex } from '@radix-ui/themes';
import React from 'react';
import { Skeleton } from './Skeleton';

export const ComponentSkeleton: React.FC = () => {
  return (
    <Card>
      <Flex direction="column" gap="4">
        {/* Header skeleton */}
        <Skeleton height="4rem" />

        {/* Main content skeleton */}
        <Skeleton height="16rem" />

        {/* Controls skeleton */}
        <Flex gap="2">
          <Skeleton height="3rem" width="100%" />
          <Skeleton height="3rem" width="100%" />
        </Flex>
      </Flex>
    </Card>
  );
};
