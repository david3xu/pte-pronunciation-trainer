/**
 * AITutorChat Component
 *
 * Interactive AI chatbot for pronunciation help and learning guidance.
 * Uses OpenAI GPT-4 for conversational assistance.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Flex, Text, TextField, Button, ScrollArea, Badge, Spinner } from '@radix-ui/themes';
import { PaperPlaneIcon, Cross2Icon, ChatBubbleIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../../ts/stores';
import { askAITutor } from '../../services/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITutorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AITutorChat: React.FC<AITutorChatProps> = ({ isOpen, onClose }) => {
  const { auth, vocabulary } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI pronunciation tutor. Ask me anything about pronunciation, vocabulary, or learning strategies!',
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

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get current word context
      const currentItem = vocabulary.currentItem;
      const context = currentItem ? {
        word: (currentItem as any).word || (currentItem as any).sentence || (currentItem as any).question,
        difficulty: (currentItem as any).difficulty || (currentItem as any).metadata?.difficulty,
      } : undefined;

      // Call AI Tutor API
      const result = await askAITutor(input.trim(), context);

      if (result.success && result.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: result.error || '⚠️ AI service error. Please check:\n\n1. Your Google Gemini API key is configured in Settings\n2. You haven\'t exceeded the free daily limit (1,500 requests)\n3. Your internet connection is stable\n\nTry again in a moment.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Connection failed. **Action needed:**\n\n• Open Settings (gear icon) and add your Google Gemini API key\n• Get a free key at: https://aistudio.google.com/apikey\n• Check your internet connection\n\nGemini is 100% FREE (1,500 requests/day)',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  // Quick question buttons
  const quickQuestions = [
    'How do I pronounce this word?',
    'What does this word mean?',
    'Give me pronunciation tips',
    'How can I improve my accent?',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
      <Card size="4" className="w-full max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col">
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <ChatBubbleIcon width="24" height="24" />
            <Text size="6" weight="bold">AI Pronunciation Tutor</Text>
            {isLoading && <Spinner size="2" />}
          </Flex>
          <Button variant="ghost" onClick={onClose}>
            <Cross2Icon width="20" height="20" />
          </Button>
        </Flex>

        {/* Messages */}
        <ScrollArea style={{ flex: 1, marginBottom: 'var(--space-4)' }}>
          <Flex direction="column" gap="3">
            {messages.map((message, index) => (
              <Flex
                key={index}
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
                  </Flex>
                </Card>
              </Flex>
            ))}
            <div ref={messagesEndRef} />
          </Flex>
        </ScrollArea>

        {/* Quick questions (show if no messages yet) */}
        {messages.length === 1 && (
          <Flex gap="2" wrap="wrap" mb="3">
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

        {/* Input */}
        <Flex gap="2" align="end">
          <TextField.Root
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about pronunciation..."
            disabled={isLoading}
          >
            <TextField.Slot>
              <ChatBubbleIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? <Spinner size="2" /> : <PaperPlaneIcon />}
          </Button>
        </Flex>

        {/* Auth warning */}
        {!auth.isAuthenticated && (
          <Flex mt="2">
            <Text size="1" color="gray">
              💡 Sign in to save your conversation history
            </Text>
          </Flex>
        )}
      </Card>
    </div>
  );
};

export default AITutorChat;
