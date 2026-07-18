export interface VoiceSelectionOptions {
  preferredName?: string | null;
  language?: string | null;
}

const normalizeLanguage = (language: string): string => language.toLowerCase().replace('_', '-');

const hasMaleVoiceName = (voice: SpeechSynthesisVoice): boolean => {
  const name = voice.name.toLowerCase();
  return name.includes('male') ||
    voice.name.includes('Daniel') ||
    voice.name.includes('Brian') ||
    voice.name.includes('Gordon') ||
    voice.name.includes('Russell') ||
    voice.name.includes('Matthew') ||
    voice.name.includes('Joey') ||
    voice.name.includes('Oliver') ||
    voice.name.includes('Google UK English Male') ||
    voice.name.includes('Google Australian English Male');
};

const findLanguageVoice = (
  voices: SpeechSynthesisVoice[],
  language: string,
  localService?: boolean,
  requireMaleName?: boolean
): SpeechSynthesisVoice | null => {
  const normalizedLanguage = normalizeLanguage(language);
  return voices.find((voice) => {
    const voiceLanguage = normalizeLanguage(voice.lang);
    const languageMatches = voiceLanguage === normalizedLanguage;
    const localMatches = localService === undefined || voice.localService === localService;
    const maleMatches = !requireMaleName || hasMaleVoiceName(voice);
    return languageMatches && localMatches && maleMatches;
  }) || null;
};

export const selectVoice = (
  voices: SpeechSynthesisVoice[],
  options: VoiceSelectionOptions = {}
): SpeechSynthesisVoice | null => {
  const { preferredName, language } = options;

  if (preferredName && preferredName !== 'premium') {
    const exactMatch = voices.find((voice) => voice.name === preferredName);
    if (exactMatch) return exactMatch;

    const partialMatch = voices.find((voice) => voice.name.includes(preferredName));
    if (partialMatch) return partialMatch;
  }

  const targetLanguage = language ? normalizeLanguage(language) : null;
  if (targetLanguage) {
    const matchingVoices = voices.filter((voice) => {
      const voiceLanguage = normalizeLanguage(voice.lang);
      return voiceLanguage === targetLanguage || voiceLanguage.startsWith(targetLanguage);
    });

    if (matchingVoices.length > 0) {
      return matchingVoices.find((voice) => voice.localService && hasMaleVoiceName(voice)) ||
        matchingVoices.find((voice) => voice.localService) ||
        matchingVoices.find(hasMaleVoiceName) ||
        matchingVoices[0] ||
        null;
    }
  }

  return findLanguageVoice(voices, 'en-GB', true, true) ||
    findLanguageVoice(voices, 'en-GB', false, true) ||
    findLanguageVoice(voices, 'en-AU', true, true) ||
    findLanguageVoice(voices, 'en-AU', false, true) ||
    findLanguageVoice(voices, 'en-GB', true) ||
    findLanguageVoice(voices, 'en-GB') ||
    findLanguageVoice(voices, 'en-AU', true) ||
    findLanguageVoice(voices, 'en-AU') ||
    voices[0] ||
    null;
};
