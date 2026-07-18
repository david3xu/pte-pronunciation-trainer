export interface PollySpeechOptions {
  text: string;
  language: string | null;
  fallback: (text: string, language: string | null) => Promise<void>;
}

const getVoiceId = (language: string | null): string => {
  if (language === 'en-AU') return 'Russell';
  if (language === 'en-GB') return 'Brian';
  return 'Brian';
};

const getLanguageCode = (language: string | null): string => {
  if (language === 'en-AU') return 'en-AU';
  if (language === 'en-GB') return 'en-GB';
  return 'en-GB';
};

export const speakWithPolly = async ({ text, language, fallback }: PollySpeechOptions): Promise<void> => {
  try {
    const voiceId = getVoiceId(language);
    const languageCode = getLanguageCode(language);

    console.log(`[PollySpeechService] 🌐 Calling Polly API with voice: ${voiceId}, lang: ${languageCode}`);

    const response = await fetch('/api/premium-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
        engine: 'neural',
        languageCode,
        outputFormat: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[PollySpeechService] API error (${response.status}): ${errorText}`);
      return fallback(text, language);
    }

    const result = await response.json();

    if (!result.success || result.fallback) {
      console.warn('[PollySpeechService] Polly unavailable, falling back to browser TTS');
      return fallback(text, language);
    }

    const audioData = `data:${result.data.contentType};base64,${result.data.audioBase64}`;
    const audio = new Audio(audioData);

    return new Promise((resolve) => {
      audio.onended = () => {
        console.log(`[PollySpeechService] ✅ Speech ended for: "${text}"`);
        resolve();
      };
      audio.onerror = () => {
        console.warn('[PollySpeechService] Audio error, falling back');
        fallback(text, language).then(resolve);
      };
      audio.play().catch(() => {
        console.warn('[PollySpeechService] Audio play failed, falling back');
        fallback(text, language).then(resolve);
      });
    });
  } catch (error) {
    console.error('[PollySpeechService] Error:', error);
    return fallback(text, language);
  }
};
