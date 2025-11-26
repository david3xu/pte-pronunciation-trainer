/**
 * Spinner Component
 * Replacement for @radix-ui/themes Spinner
 */

import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: '1' | '2' | '3';
}

export function Spinner({ className = '', size = '2' }: SpinnerProps) {
  const sizeClasses = {
    '1': 'h-4 w-4',
    '2': 'h-6 w-6',
    '3': 'h-8 w-8',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
