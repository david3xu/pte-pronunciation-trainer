import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
  });

  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/PTE Pronunciation Trainer/i)).toBeInTheDocument();
  });

  it('renders the AI Tutor button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /AI Tutor/i })).toBeInTheDocument();
  });

  it('renders the Practice button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Practice/i })).toBeInTheDocument();
  });

  it('renders the Settings button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });

  it('renders Practice and Progress tabs', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Practice/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Progress/i })).toBeInTheDocument();
  });

  it('displays the app version in footer', () => {
    render(<App />);
    expect(screen.getByText(/v2\.5\.4/i)).toBeInTheDocument();
  });

  it('displays the tech stack in footer', () => {
    render(<App />);
    expect(screen.getByText(/React \+ TypeScript \+ Zustand/i)).toBeInTheDocument();
  });
});
