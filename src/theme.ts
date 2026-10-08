// Dinner Sorted design tokens: warm paper background, paprika as the main colour,
// herb green for "healthy / you have it" signals, and gold for Premium.

export const colors = {
  bg: '#FBF7F2',
  card: '#FFFFFF',
  ink: '#221B16',
  body: '#4A413A',
  muted: '#6B6159',
  line: '#EDE5DB',
  chipLine: '#DCD2C6',
  dashed: '#CFC3B5',
  soft: '#F3EDE5',
  segment: '#F1EAE1',
  track: '#EFE8DF',
  disabled: '#D9CFC3',

  accent: '#C2410C',
  accentDark: '#9A3412',
  accentTint: '#FCE9DF',

  herb: '#2C7A4B',
  herbDark: '#1F5C38',
  herbTint: '#E6F2EA',

  gold: '#F2B229',
  goldInk: '#2A1F00',
  goldTint: '#FDF3DA',
  goldLine: '#F0D68C',

  danger: '#8E2F1C',
  dangerTint: '#FBE7E2',

  dark: '#221B16',
  darkTile: '#3A2F28',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

export const radius = { sm: 10, md: 14, lg: 16, xl: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Background colours for dishes without a photo, picked from the recipe id. */
const TONES = ['#A4472A', '#B23A2F', '#B8692A', '#5B7A2E', '#4E7A3A', '#2F5D74', '#6D4C3B', '#8C3A2B', '#94631C', '#7E5320'];
export function toneFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
