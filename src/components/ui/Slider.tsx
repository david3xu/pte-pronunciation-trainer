/**
 * Slider Component
 * Replacement for @radix-ui/themes Slider using @radix-ui/react-slider primitive
 */

import * as SliderPrimitive from '@radix-ui/react-slider';
import React from 'react';

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  size?: '1' | '2' | '3';
}

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className = '', size = '2', ...props }, ref) => {
  const trackHeightClasses = {
    '1': 'h-1',
    '2': 'h-1.5',
    '3': 'h-2',
  };

  const thumbSizeClasses = {
    '1': 'h-3 w-3',
    '2': 'h-4 w-4',
    '3': 'h-5 w-5',
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={`relative flex w-full touch-none select-none items-center ${className}`}
      {...props}
    >
      <SliderPrimitive.Track
        className={`relative w-full grow overflow-hidden rounded-full bg-app-border ${trackHeightClasses[size]}`}
      >
        <SliderPrimitive.Range className="absolute h-full bg-[var(--accent-9)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={`block ${thumbSizeClasses[size]} rounded-full border-2 border-[var(--accent-9)] bg-white ring-offset-app-bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-50`}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = 'Slider';
