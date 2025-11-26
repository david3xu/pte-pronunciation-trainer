/**
 * Card Component
 * Replacement for @radix-ui/themes Card
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: '1' | '2' | '3' | '4';
  variant?: 'surface' | 'classic' | 'ghost';
}

export function Card({
  children,
  className = '',
  size = '3',
  variant = 'surface',
  ...props
}: CardProps) {
  const sizeClasses = {
    '1': 'p-2',
    '2': 'p-3',
    '3': 'p-4',
    '4': 'p-6',
  };

  const variantClasses = {
    surface: 'bg-app-bg-card border border-app-border-dark shadow-xl',
    classic: 'bg-app-bg-elevated border border-app-border shadow-2xl',
    ghost: 'bg-transparent',
  };

  return (
    <div
      className={`rounded-lg ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
