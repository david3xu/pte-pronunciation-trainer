/**
 * useSwipeGesture Hook
 *
 * Handles touch swipe gestures for mobile navigation.
 * Supports left/right swipes with configurable threshold.
 */

import { useRef } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum swipe distance in pixels
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 75,
}: SwipeOptions) => {
  const touchStart = useRef<TouchPosition | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Reset touch start
    touchStart.current = null;

    // Check if swipe is horizontal (not vertical scroll)
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (!isHorizontal) return;

    // Check if swipe distance meets threshold
    const distance = Math.abs(deltaX);
    if (distance < threshold) return;

    // Check if swipe is fast enough (max 300ms)
    if (deltaTime > 300) return;

    // Determine swipe direction
    if (deltaX > 0) {
      // Swipe right
      onSwipeRight?.();
    } else {
      // Swipe left
      onSwipeLeft?.();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default only for horizontal swipes to allow vertical scrolling
    if (!touchStart.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - touchStart.current.x);
    const deltaY = Math.abs(touch.clientY - touchStart.current.y);

    // If horizontal movement is greater, prevent default to stop scroll
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  };

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    },
  };
};
