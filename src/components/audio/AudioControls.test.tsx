import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controllerMocks = vi.hoisted(() => ({
  handlePlay: vi.fn(),
  handlePause: vi.fn(),
  handleNext: vi.fn(),
  handlePrev: vi.fn(),
  handleResumeTap: vi.fn(),
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
      useAppStore.getState().settings.updateSetting('autoPlay', true);
    });
  });

  afterEach(() => {
    act(() => {
      useAppStore.getState().audio.stopAutoPlay();
      useAppStore.getState().settings.updateSetting('autoPlay', true);
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

  it('keeps the auto-play switch tied to the setting, not transient playback state', async () => {
    const user = userEvent.setup();
    act(() => {
      useAppStore.getState().settings.updateSetting('autoPlay', false);
      useAppStore.getState().audio.startAutoPlay();
    });

    render(<AudioControls />);

    const [autoPlaySwitch] = screen.getAllByRole('switch');
    expect(autoPlaySwitch).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByRole('button', { name: /^Pause$/ }));

    expect(controllerMocks.handlePause).toHaveBeenCalledTimes(1);
    expect(autoPlaySwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('returns the main button to Play when autoplay stops', () => {
    render(<AudioControls />);

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
    });
    expect(screen.getByRole('button', { name: /^Pause$/ })).toBeInTheDocument();

    act(() => {
      useAppStore.getState().audio.stopAutoPlay();
    });

    expect(screen.getByRole('button', { name: /^Play$/ })).toBeInTheDocument();
  });

  it('shows a resume prompt wired to handleResumeTap when needsResume is true', async () => {
    const user = userEvent.setup();
    act(() => {
      useAppStore.getState().audio.startAutoPlay();
      useAppStore.getState().audio.pauseAutoPlay();
      useAppStore.getState().audio.setNeedsResume(true, 'suspended');
    });

    render(<AudioControls />);

    expect(screen.getByText(/suspended/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Resume audio/i }));

    expect(controllerMocks.handleResumeTap).toHaveBeenCalledTimes(1);
  });

  it('does not show a resume prompt when needsResume is false', () => {
    render(<AudioControls />);

    expect(screen.queryByRole('button', { name: /Resume audio/i })).not.toBeInTheDocument();
  });
});
