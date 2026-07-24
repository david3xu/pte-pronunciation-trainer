import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controllerMocks = vi.hoisted(() => ({
  handlePlay: vi.fn(),
  handlePause: vi.fn(),
  handleNext: vi.fn(),
  handlePrev: vi.fn(),
}));

vi.mock('../../services/audio/backgroundAudioService', () => ({
  backgroundAudioService: {
    setRate: vi.fn(),
  },
}));

vi.mock('./hooks/useAutoPlayController', () => ({
  useAutoPlayController: () => controllerMocks,
}));

import { useAppStore } from '../../stores';
import AudioControls from './AudioControls';

describe('AudioControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAppStore.getState().audio.stopAutoPlay();
      useAppStore.getState().audio.setCurrentIndex(0);
    });
  });

  afterEach(() => {
    act(() => {
      useAppStore.getState().audio.stopAutoPlay();
    });
  });

  it('resumes paused autoplay through the gesture-safe playback controller', async () => {
    const user = userEvent.setup();
    act(() => {
      useAppStore.getState().audio.startAutoPlay();
      useAppStore.getState().audio.pauseAutoPlay();
    });

    render(<AudioControls />);

    await user.click(screen.getByRole('button', { name: /^Play$/ }));

    expect(controllerMocks.handlePlay).toHaveBeenCalledTimes(1);
    expect(controllerMocks.handlePause).not.toHaveBeenCalled();
  });
});
