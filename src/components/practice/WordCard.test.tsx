import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyTerm } from '../../types/dataset.types';
import WordCard from './WordCard';

// Mock the Zustand store
vi.mock('../../stores', () => ({
  useAppStore: () => ({
    tts: {
      startSpeaking: vi.fn(),
      stopSpeaking: vi.fn(),
      isSpeaking: false,
    },
    vocabulary: {
      currentItem: null,
      items: [],
      currentIndex: 0,
    },
    settings: {
      practiceMode: 'vocabulary',
      difficultyFilter: 'all',
      ttsRate: 1.0,
    },
    progress: {
      currentIndex: 0,
      totalItems: 0,
    },
    auth: {
      isAuthenticated: false,
      user: null,
    },
    ui: {
      showNotification: vi.fn(),
    },
  }),
}));

const mockVocabularyTerm: VocabularyTerm = {
  word: 'ubiquitous',
  difficulty: 'hard',
  category: 'pte-advanced',
  ipa: {
    british: '/juːˈbɪkwɪtəs/',
    american: '/juːˈbɪkwɪtəs/',
  },
  phonetic: {
    british: 'yoo-BIK-wi-tuhs',
    american: 'yoo-BIK-wi-tuhs',
  },
};

describe('WordCard Component', () => {
  it('renders vocabulary word', () => {
    render(

        <WordCard item={mockVocabularyTerm} />

    );

    expect(screen.getByText('ubiquitous')).toBeInTheDocument();
  });

  it('displays IPA pronunciation for vocabulary terms', () => {
    render(

        <WordCard item={mockVocabularyTerm} />

    );

    // IPA appears twice (British and American)
    const ipaElements = screen.getAllByText(/juːˈbɪkwɪtəs/);
    expect(ipaElements.length).toBeGreaterThan(0);
  });

  it('shows difficulty badge', () => {
    render(

        <WordCard item={mockVocabularyTerm} />

    );

    expect(screen.getByText(/hard/i)).toBeInTheDocument();
  });

  it('renders speak button', () => {
    render(

        <WordCard item={mockVocabularyTerm} />

    );

    const speakButtons = screen.getAllByRole('button');
    expect(speakButtons.length).toBeGreaterThan(0);
  });
});
