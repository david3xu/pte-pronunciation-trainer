/**
 * Text Component
 * Replacement for @radix-ui/themes Text
 */

import React from 'react';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  weight?: 'light' | 'regular' | 'medium' | 'bold';
  color?: 'gray' | 'blue' | 'red' | 'green' | 'yellow' | 'violet' | 'orange' | 'purple' | 'gold';
  as?: 'p' | 'span' | 'div' | 'label';
  align?: 'left' | 'center' | 'right';
  // Margin props (Radix Themes compatibility)
  m?: string;
  mt?: string;
  mb?: string;
  ml?: string;
  mr?: string;
}

export function Text({
  children,
  className = '',
  size = '3',
  weight = 'regular',
  color,
  as: Component = 'p',
  align,
  m, mt, mb, ml, mr,
  ...props
}: TextProps) {
  const sizeMap = {
    '1': 'text-xs',
    '2': 'text-sm',
    '3': 'text-base',
    '4': 'text-lg',
    '5': 'text-xl',
    '6': 'text-2xl',
    '7': 'text-3xl',
    '8': 'text-4xl',
    '9': 'text-5xl',
  };

  const weightMap = {
    light: 'font-light',
    regular: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold',
  };

  const colorMap = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    violet: 'text-violet-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    gold: 'text-yellow-500',
  };

  const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const colorClass = color ? colorMap[color] : '';
  const alignClass = align ? alignMap[align] : '';

  // Build spacing classes
  const spacingClasses = [
    m && `m-${m}`,
    mt && `mt-${mt}`,
    mb && `mb-${mb}`,
    ml && `ml-${ml}`,
    mr && `mr-${mr}`,
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={`${sizeMap[size]} ${weightMap[weight]} ${colorClass} ${alignClass} ${spacingClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
