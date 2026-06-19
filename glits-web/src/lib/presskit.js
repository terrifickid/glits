export const LINK = 'https://futurecaribbean.com';
export const PRESSKIT_TEXT =
  '🌴 Build intelligence that moves the real world. Future Caribbean is a global Agentic AI buildathon — 40 teams, 10 tracks, $70K prizes, NVIDIA H200 compute, and a live pitch at the NYSE. Applications close July 3 → futurecaribbean.com';
export const HASHTAGS =
  '#FutureCaribbean #AgenticAI #Buildathon #Caribbean #OpenSource #AI #Innovation';

/** @param {string} text */
export function formatShareText(text) {
  return `${text} ${HASHTAGS}`;
}