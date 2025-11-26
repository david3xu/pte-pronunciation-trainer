/**
 * Stub Components
 * Temporary implementations for components not yet migrated from Radix Themes
 * These provide basic functionality to keep the app building
 */

import React from 'react';
import { Button } from './Button';

// TextField - basic text input
export const TextField = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type="text"
    {...props}
    className={`border border-gray-300 rounded px-3 py-2 ${props.className || ''}`}
  />
);

// TextArea - basic textarea (remove size prop, not valid)
export const TextArea = ({ size, ...props }: any) => (
  <textarea
    {...props}
    className={`border border-gray-300 rounded px-3 py-2 ${props.className || ''}`}
  />
);

// ScrollArea - simple div wrapper
export const ScrollArea = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={`overflow-auto ${props.className || ''}`}>
    {children}
  </div>
);

// Separator - horizontal rule
export const Separator = (props: React.HTMLAttributes<HTMLHRElement>) => (
  <hr {...props} className={`my-2 border-gray-600 ${props.className || ''}`} />
);

// Progress - simple progress bar (with value, max, color props)
export const Progress = ({ value = 50, max = 100, color, ...props }: any) => (
  <div {...props} className="w-full bg-app-border rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all ${color === 'green' ? 'bg-green-600' : color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}
      style={{ width: `${(value / max) * 100}%` }}
    />
  </div>
);

// Checkbox - basic checkbox
export const Checkbox = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input type="checkbox" {...props} className="form-checkbox" />
);

// IconButton - reuse Button component
export const IconButton = Button;

// Tooltip - simple pass-through (proper implementation later)
export const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>;
