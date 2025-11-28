/**
 * stripMarkdown - removes basic markdown syntax from text
 * Removes: **bold**, __bold__, *italic*, _italic_
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';

  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
    .replace(/__([^_]+)__/g, '$1')      // Remove __bold__
    .replace(/\*([^*]+)\*/g, '$1')      // Remove *italic*
    .replace(/_([^_]+)_/g, '$1');        // Remove _italic_
};
