/**
 * AITutorChat Component
 *
 * Interactive AI chatbot for pronunciation help and learning guidance.
 *
 * Phase 2 Enhanced: Context-aware AI with task-specific personas
 * - Uses learner profile, session stats, and recent errors for personalized responses
 * - Supports response rating (thumbs up/down)
 * - Persists conversation history
 */

import { ChatBubbleIcon, Cross2Icon, PaperPlaneIcon, ThickArrowDownIcon, ThickArrowUpIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, IconButton, ScrollArea, Spinner, Text, TextField, Tooltip } from '@radix-ui/themes';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askAITutorStream } from '../../services/ai';
import { rateAIResponse } from '../../services/ai/ratingService';
import { useAppStore } from '../../stores';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: 'helpful' | 'not_helpful';
  id: string;
}

interface AITutorChatProps {
  isOpen: boolean;
  onClose: () => void;
  taskType?: 'rs' | 'asq' | 'wfd' | 'ra' | 'di' | 'rl' | 'fib_r' | 'fib_l' | 'vocabulary';
  sessionId?: string;
  useEnhancedContext?: boolean;
}

const AITutorChat: React.FC<AITutorChatProps> = ({
  isOpen,
  onClose,
  taskType,
  sessionId,
  useEnhancedContext = !!taskType
}) => {
  const { auth, vocabulary } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: taskType
        ? `Hello! I'm your **${getTaskTypeName(taskType)} specialist**. I'm here to help you improve your performance. Ask me anything about this task type!`
        : 'Hello! I\'m your AI pronunciation tutor. Ask me anything about pronunciation, vocabulary, or learning strategies!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle response rating
  const handleRating = async (messageId: string, rating: 'helpful' | 'not_helpful') => {
    // Update UI immediately
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, rating } : msg
      )
    );

    // Save rating to database (Phase 2)
    const message = messages.find((msg) => msg.id === messageId);
    if (message && auth.user?.id) {
      try {
        const result = await rateAIResponse(
          message.content,
          rating,
          auth.user.id,
          message.timestamp
        );

        if (!result.success) {
          console.warn(`[AITutorChat] Rating save failed: ${result.error}`);
        }
      } catch (error) {
        console.error('[AITutorChat] Rating error:', error);
      }
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '', // Start empty
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Get current word context
      const currentItem = vocabulary.currentItem;

      // Phase 1: Legacy context
      const legacyContext = currentItem ? {
        word: (currentItem as any).word || (currentItem as any).sentence || (currentItem as any).question,
        difficulty: (currentItem as any).difficulty || (currentItem as any).metadata?.difficulty,
      } : undefined;

      // Phase 2: Enhanced current item context
      const enhancedCurrentItem = currentItem ? {
        text: (currentItem as any).word || (currentItem as any).sentence || (currentItem as any).question || '',
        userResponse: (currentItem as any).userResponse,
        transcription: (currentItem as any).transcription,
        score: (currentItem as any).score,
        attempts: (currentItem as any).attempts,
      } : undefined;

      // Build conversation history (exclude ratings from API)
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call AI Tutor API with Streaming
      let accumulatedAnswer = '';

      const result = await askAITutorStream(
        userMessage.content,
        (token) => {
          accumulatedAnswer += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedAnswer }
                : msg
            )
          );
        },
        {
          // Phase 1 (legacy) parameters
          context: legacyContext,
          conversationHistory,
          // Phase 2 (enhanced) parameters
          userId: auth.user?.id,
          taskType: taskType,
          sessionId: sessionId,
          currentItem: enhancedCurrentItem,
          useEnhancedContext: useEnhancedContext,
        }
      );

      if (!result.success) {
        // If request failed completely (e.g. network error before stream)
        const errorMessage = result.error || '⚠️ AI service error. Please check your connection.';

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: errorMessage }
              : msg
          )
        );
      }
    } catch (error) {
      const errorMessage = '❌ Connection failed. Please check your internet connection.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick question buttons (task-specific if taskType provided)
  const quickQuestions = taskType ? getTaskSpecificQuestions(taskType) : [
    'How do I pronounce this word?',
    'What does this word mean?',
    'Give me pronunciation tips',
    'How can I improve my accent?',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
      <Card size="4" className="w-full max-w-3xl h-[85vh] sm:h-[80vh]" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <ChatBubbleIcon width="24" height="24" />
            <Flex direction="column" gap="1">
              <Text size="6" weight="bold">
                {taskType ? `${getTaskTypeName(taskType)} Tutor` : 'AI Pronunciation Tutor'}
              </Text>
              {useEnhancedContext && (
                <Badge size="1" color="green">Context-Aware (Phase 2)</Badge>
              )}
            </Flex>
            {isLoading && <Spinner size="2" />}
          </Flex>
          <Button variant="ghost" onClick={onClose}>
            <Cross2Icon width="20" height="20" />
          </Button>
        </Flex>

        {/* Messages */}
        <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, marginBottom: 'var(--space-4)', minHeight: 0 }}>
          <Flex direction="column" gap="3">
            {messages.map((message) => (
              <Flex
                key={message.id}
                justify={message.role === 'user' ? 'end' : 'start'}
              >
                <Card
                  size="2"
                  style={{
                    maxWidth: '80%',
                    backgroundColor: message.role === 'user'
                      ? 'var(--accent-9)'
                      : 'var(--gray-3)',
                  }}
                >
                  <Flex direction="column" gap="2">
                    {message.role === 'assistant' && (
                      <Badge size="1" color="blue">AI Tutor</Badge>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Customize markdown rendering
                            p: ({ children }) => <Text size="2">{children}</Text>,
                            strong: ({ children }) => <Text weight="bold">{children}</Text>,
                            em: ({ children }) => <span style={{ fontStyle: 'italic' }}>{children}</span>,
                            code: ({ children }) => (
                              <code
                                style={{
                                  backgroundColor: 'var(--gray-a3)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.9em',
                                }}
                              >
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <Text
                        size="2"
                        style={{
                          whiteSpace: 'pre-wrap',
                          color: 'white',
                        }}
                      >
                        {message.content}
                      </Text>
                    )}
                    <Flex justify="between" align="center">
                      <Text
                        size="1"
                        color="gray"
                        style={{
                          opacity: 0.7,
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {/* Phase 2: Response Rating */}
                      {message.role === 'assistant' && !message.content.includes('❌') && !message.content.includes('⚠️') && (
                        <Flex gap="1">
                          <Tooltip content="Helpful">
                            <IconButton
                              size="1"
                              variant={message.rating === 'helpful' ? 'solid' : 'ghost'}
                              color={message.rating === 'helpful' ? 'green' : 'gray'}
                              onClick={() => handleRating(message.id, 'helpful')}
                            >
                              <ThickArrowUpIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip content="Not Helpful">
                            <IconButton
                              size="1"
                              variant={message.rating === 'not_helpful' ? 'solid' : 'ghost'}
                              color={message.rating === 'not_helpful' ? 'red' : 'gray'}
                              onClick={() => handleRating(message.id, 'not_helpful')}
                            >
                              <ThickArrowDownIcon />
                            </IconButton>
                          </Tooltip>
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              </Flex>
            ))}
            <div ref={messagesEndRef} />
          </Flex>
        </ScrollArea>

        {/* Quick questions (show if only initial message) */}
        {messages.length === 1 && (
          <Flex gap="2" wrap="wrap" mb="3" style={{ flexShrink: 0 }}>
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="soft"
                size="1"
                onClick={() => {
                  setInput(question);
                  setTimeout(() => handleSend(), 100);
                }}
              >
                {question}
              </Button>
            ))}
          </Flex>
        )}

        <Flex
          gap="2"
          align="end"
          style={{
            flexShrink: 0,
            marginTop: 'auto',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--gray-a5)'
          }}
        >
          <TextField.Root style={{ flex: 1 }}>
            <TextField.Slot>
              <input
                className="rt-reset rt-TextFieldInput"
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit' }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={taskType ? `Ask about ${getTaskTypeName(taskType)}...` : "Ask me about pronunciation..."}
                disabled={isLoading}
              />
            </TextField.Slot>
          </TextField.Root>
          <Button
            size="3"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? <Spinner size="2" /> : <PaperPlaneIcon />}
          </Button>
        </Flex>

        {/* Auth warning / Phase 2 indicator */}
        <Flex mt="2" justify="between" align="center" style={{ flexShrink: 0 }}>
          {!auth.isAuthenticated ? (
            <Text size="1" color="gray">
              💡 Sign in to enable context-aware AI responses
            </Text>
          ) : useEnhancedContext ? (
            <Text size="1" color="green">
              ✓ AI is using your profile and session data for personalized responses
            </Text>
          ) : (
            <Text size="1" color="gray">
              Using general AI mode (legacy)
            </Text>
          )}
        </Flex>
      </Card>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function getTaskTypeName(taskType: string): string {
  const names: Record<string, string> = {
    rs: 'Repeat Sentence',
    asq: 'Answer Short Question',
    wfd: 'Write From Dictation',
    ra: 'Read Aloud',
    di: 'Describe Image',
    rl: 'Retell Lecture',
    fib_r: 'Fill in the Blanks (Reading)',
    fib_l: 'Fill in the Blanks (Listening)',
    vocabulary: 'Vocabulary',
  };
  return names[taskType] || 'PTE';
}

function getTaskSpecificQuestions(taskType: string): string[] {
  const questions: Record<string, string[]> = {
    rs: [
      'How can I remember longer sentences?',
      'Tips for improving fluency?',
      'Why did I miss that word?',
      'How to practice stress patterns?',
    ],
    asq: [
      'How to answer faster?',
      'General knowledge tips?',
      'What if I don\'t know the answer?',
      'Common question types?',
    ],
    wfd: [
      'How to improve spelling?',
      'Grammar tips for dictation?',
      'How to catch all words?',
      'Article usage rules?',
    ],
    ra: [
      'How to read more naturally?',
      'Pronunciation tips?',
      'How to use prep time?',
      'Pacing advice?',
    ],
    vocabulary: [
      'How do I pronounce this word?',
      'What does this word mean?',
      'Example sentences?',
      'Memory techniques?',
    ],
  };
  return questions[taskType] || [
    'How can I improve?',
    'What are common mistakes?',
    'Give me study tips',
    'How to practice this?',
  ];
}

export default AITutorChat;
