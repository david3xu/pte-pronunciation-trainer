/**
 * Button Component
 * Replacement for @radix-ui/themes Button
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'surface';
  size?: '1' | '2' | '3' | '4';
  color?: 'blue' | 'red' | 'green' | 'gray' | 'violet' | 'orange';
}

export function Button({
  children,
  className = '',
  variant = 'solid',
  size = '2',
  color = 'blue',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    '1': 'px-2 py-1 text-xs',
    '2': 'px-3 py-1.5 text-sm',
    '3': 'px-4 py-2 text-base',
    '4': 'px-5 py-2.5 text-lg',
  };

  const variantClasses = {
    solid: {
      blue: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      green: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      gray: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      violet: 'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500',
      orange: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
    },
    soft: {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500',
      gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
      violet: 'bg-violet-100 text-violet-700 hover:bg-violet-200 focus:ring-violet-500',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-500',
    },
    outline: {
      blue: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      red: 'border-2 border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500',
      green: 'border-2 border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500',
      gray: 'border-2 border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      violet: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50 focus:ring-violet-500',
      orange: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50 focus:ring-orange-500',
    },
    ghost: {
      blue: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      red: 'text-red-600 hover:bg-red-50 focus:ring-red-500',
      green: 'text-green-600 hover:bg-green-50 focus:ring-green-500',
      gray: 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      violet: 'text-violet-600 hover:bg-violet-50 focus:ring-violet-500',
      orange: 'text-orange-600 hover:bg-orange-50 focus:ring-orange-500',
    },
    surface: {
      blue: 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 focus:ring-blue-500',
      red: 'bg-white border border-red-200 text-red-700 hover:bg-red-50 focus:ring-red-500',
      green: 'bg-white border border-green-200 text-green-700 hover:bg-green-50 focus:ring-green-500',
      gray: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
      violet: 'bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 focus:ring-violet-500',
      orange: 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 focus:ring-orange-500',
    },
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant][color]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
