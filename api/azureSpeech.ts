import { getAzureSpeechConfig, getVoiceLanguageCode, resolveAzureVoiceName } from './config';

export interface SynthesizeSpeechOptions {
  text: string;
  voiceId?: string;
  languageCode?: string;
  speed?: string;
  pitch?: string;
  emphasis?: 'strong' | 'moderate' | 'reduced' | 'none';
}

export interface SynthesizeSpeechResult {
  audioBuffer: Buffer;
  contentType: string;
  voiceId: string;
  languageCode: string;
}

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSsml({
  text,
  voiceId,
  languageCode,
  speed = '100%',
  pitch = 'medium',
  emphasis = 'moderate',
}: SynthesizeSpeechOptions & { voiceId: string; languageCode: string }): string {
  const escapedText = escapeXml(text);
  const content = emphasis !== 'none'
    ? `<emphasis level="${emphasis}">${escapedText}</emphasis>`
    : escapedText;

  return [
    `<speak version="1.0" xml:lang="${languageCode}" xmlns="http://www.w3.org/2001/10/synthesis">`,
    `<voice name="${voiceId}">`,
    `<prosody rate="${speed}" pitch="${pitch}">${content}</prosody>`,
    '</voice>',
    '</speak>',
  ].join('');
}

export async function synthesizeSpeech({
  text,
  voiceId,
  languageCode,
  speed,
  pitch,
  emphasis,
}: SynthesizeSpeechOptions): Promise<SynthesizeSpeechResult> {
  const { key, region } = getAzureSpeechConfig();

  if (!key || !region) {
    throw new Error('Azure Speech is not configured');
  }

  const resolvedVoiceId = resolveAzureVoiceName(voiceId, languageCode);
  const resolvedLanguageCode = languageCode || getVoiceLanguageCode(resolvedVoiceId);
  const ssml = buildSsml({
    text,
    voiceId: resolvedVoiceId,
    languageCode: resolvedLanguageCode,
    speed,
    pitch,
    emphasis,
  });

  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'Ocp-Apim-Subscription-Key': key,
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
      'User-Agent': 'pte-pronunciation-trainer',
    },
    body: ssml,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Azure Speech request failed (${response.status}): ${details || response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    audioBuffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'audio/mpeg',
    voiceId: resolvedVoiceId,
    languageCode: resolvedLanguageCode,
  };
}
