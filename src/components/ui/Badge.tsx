/**
 * Badge Component
 * Replacement for @radix-ui/themes Badge
 */

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'solid' | 'soft' | 'outline';
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'gray' | 'violet' | 'orange' | 'purple' | 'gold';
  size?: '1' | '2' | '3';
}

export function Badge({
  children,
  className = '',
  variant = 'soft',
  color = 'blue',
  size = '2',
  ...props
}: BadgeProps) {
  const sizeClasses = {
    '1': 'px-1.5 py-0.5 text-xs',
    '2': 'px-2.5 py-0.5 text-xs',
    '3': 'px-3 py-1 text-sm',
  };

  const variantClasses = {
    solid: {
      blue: 'bg-blue-600 text-white',
      red: 'bg-red-600 text-white',
      green: 'bg-green-600 text-white',
      yellow: 'bg-yellow-600 text-white',
      gray: 'bg-gray-600 text-white',
      violet: 'bg-violet-600 text-white',
      orange: 'bg-orange-600 text-white',
      purple: 'bg-purple-600 text-white',
      gold: 'bg-yellow-500 text-white',
    },
    soft: {
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      gray: 'bg-gray-100 text-gray-800',
      violet: 'bg-violet-100 text-violet-800',
      orange: 'bg-orange-100 text-orange-800',
      purple: 'bg-purple-100 text-purple-800',
      gold: 'bg-yellow-50 text-yellow-800',
    },
    outline: {
      blue: 'border border-blue-600 text-blue-600',
      red: 'border border-red-600 text-red-600',
      green: 'border border-green-600 text-green-600',
      yellow: 'border border-yellow-600 text-yellow-600',
      gray: 'border border-gray-600 text-gray-600',
      violet: 'border border-violet-600 text-violet-600',
      orange: 'border border-orange-600 text-orange-600',
      purple: 'border border-purple-600 text-purple-600',
      gold: 'border border-yellow-500 text-yellow-600',
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant][color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
