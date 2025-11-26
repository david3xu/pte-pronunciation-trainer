/**
 * Flex Component
 * Replacement for @radix-ui/themes Flex
 */

import React from 'react';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  gap?: '1' | '2' | '3' | '4' | '5' | '6' | '8';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  // Margin props (Radix Themes compatibility)
  m?: string;
  mt?: string;
  mb?: string;
  ml?: string;
  mr?: string;
  mx?: string;
  my?: string;
  // Padding props (Radix Themes compatibility)
  p?: string;
  pt?: string;
  pb?: string;
  pl?: string;
  pr?: string;
  px?: string;
  py?: string;
}

export function Flex({
  children,
  className = '',
  direction = 'row',
  align,
  justify,
  gap = '2',
  wrap,
  m, mt, mb, ml, mr, mx, my,
  p, pt, pb, pl, pr, px, py,
  ...props
}: FlexProps) {
  const directionMap = {
    row: 'flex-row',
    column: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse',
  };

  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
  };

  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  const gapMap = {
    '1': 'gap-1',
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '5': 'gap-5',
    '6': 'gap-6',
    '8': 'gap-8',
  };

  const wrapMap = {
    wrap: 'flex-wrap',
    nowrap: 'flex-nowrap',
    'wrap-reverse': 'flex-wrap-reverse',
  };

  // Build spacing classes
  const spacingClasses = [
    m && `m-${m}`,
    mt && `mt-${mt}`,
    mb && `mb-${mb}`,
    ml && `ml-${ml}`,
    mr && `mr-${mr}`,
    mx && `mx-${mx}`,
    my && `my-${my}`,
    p && `p-${p}`,
    pt && `pt-${pt}`,
    pb && `pb-${pb}`,
    pl && `pl-${pl}`,
    pr && `pr-${pr}`,
    px && `px-${px}`,
    py && `py-${py}`,
  ].filter(Boolean).join(' ');

  const classes = [
    'flex',
    directionMap[direction],
    align ? alignMap[align] : '',
    justify ? justifyMap[justify] : '',
    gap ? gapMap[gap] : '',
    wrap ? wrapMap[wrap] : '',
    spacingClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
