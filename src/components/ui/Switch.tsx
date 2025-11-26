/**
 * Switch Component
 * Replacement for @radix-ui/themes Switch using @radix-ui/react-switch primitive
 */

import * as SwitchPrimitive from '@radix-ui/react-switch';
import React from 'react';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  size?: '1' | '2' | '3';
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className = '', size = '2', ...props }, ref) => {
  const sizeClasses = {
    '1': 'h-4 w-7',
    '2': 'h-5 w-9',
    '3': 'h-6 w-11',
  };

  const thumbSizeClasses = {
    '1': 'h-3 w-3 data-[state=checked]:translate-x-3',
    '2': 'h-4 w-4 data-[state=checked]:translate-x-4',
    '3': 'h-5 w-5 data-[state=checked]:translate-x-5',
  };

  return (
    <SwitchPrimitive.Root
      className={`peer inline-flex ${sizeClasses[size]} shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--accent-9)] data-[state=unchecked]:bg-app-border ${className}`}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        className={`pointer-events-none block ${thumbSizeClasses[size]} rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0`}
      />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = 'Switch';
