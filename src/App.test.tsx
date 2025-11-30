import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
  });

  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/PTE Pronunciation/i)).toBeInTheDocument();
  });

  it('renders the Progress button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Progress/i })).toBeInTheDocument();
  });

  it('renders the AI Tutor button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /AI Tutor/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the Insights button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /Insights/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the Score button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /Score/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the Settings button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });

  it('displays the app version in footer', () => {
    render(<App />);
    expect(screen.getByText(/v\d+\.\d+\.\d+/i)).toBeInTheDocument();
  });
});
