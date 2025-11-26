/**
 * Tabs Component
 * Replacement for @radix-ui/themes Tabs using @radix-ui/react-tabs primitive
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React from 'react';

// Root
export const Tabs = TabsPrimitive.Root;

// List
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className = '', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={`inline-flex h-10 items-center justify-center bg-transparent text-app-text-primary border-b border-app-border ${className}`}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

// Trigger
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className = '', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-app-bg-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-app-text-secondary data-[state=active]:text-app-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] ${className}`}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

// Content
export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className = '', ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={`mt-2 ring-offset-app-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-border-focus focus-visible:ring-offset-2 ${className}`}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
