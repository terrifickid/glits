export const LINK = 'https://futurecaribbean.com';
export const PRESSKIT_TEXT =
  '🌴 Build intelligence that moves the real world. Future Caribbean is a global Agentic AI buildathon 40 teams 10 tracks 70K prizes NVIDIA H200 compute and a live pitch at the NYSE. Applications close July 3 at futurecaribbean.com';
export const HASHTAGS =
  '#FutureCaribbean #AgenticAI #Buildathon #Caribbean #OpenSource #AI #Innovation';

/** @param {string} text */
export function sanitizeSocialText(text) {
  return text
    .replace(/Don\u2019t/g, 'Do not')
    .replace(/don\u2019t/g, 'do not')
    .replace(/we\u2019re/g, 'we are')
    .replace(/we\u2019ve/g, 'we have')
    .replace(/world\u2019s/g, 'world')
    .replace(/region\u2019s/g, 'region')
    .replace(/Caribbean\u2019s/g, 'Caribbean')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/(\d+)\+/g, '$1 plus')
    .replace(/\s*\+\s*/g, ' and ')
    .replace(/→/g, ' at ')
    .replace(/[—–]/g, ' ')
    .replace(/•/g, '. ')
    .replace(/[""]/g, '')
    .replace(/['\u2018\u2019]/g, '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/[()]/g, '')
    .replace(/:/g, ' ')
    .replace(/\//g, ' ')
    .replace(/-/g, ' ')
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/%/g, '')
    .replace(/[^\p{L}\p{N}\s.\p{Extended_Pictographic}]/gu, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/ \./g, '.')
    .trim();
}

/** @param {string} text */
export function formatShareText(text) {
  return `${sanitizeSocialText(text)} ${HASHTAGS}`;
}