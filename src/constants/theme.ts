// Design intent: most arbiters using this app are older and not
// particularly tech-savvy, often on modest Android phones. Every choice
// here favors legibility and unambiguous tap targets over density:
// - larger base font size than typical apps (18px body, not 14-16px)
// - one strong, high-contrast brand color used consistently for anything
//   tappable, so "this color = you can press it" never has to be relearned
// - minimum ~52px touch targets everywhere (buttons, list rows, tab bar)

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    textSecondary: '#5B5F6B',
    background: '#ffffff',
    backgroundElement: '#F4F5F8',
    backgroundSelected: '#E7E9F5',
    border: '#E1E3E9',
    primary: '#4F46E5',
    primaryText: '#ffffff',
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
  },
  dark: {
    text: '#F5F6F8',
    textSecondary: '#B0B4BA',
    background: '#121212',
    backgroundElement: '#1F2023',
    backgroundSelected: '#2B2D45',
    border: '#2E3036',
    primary: '#818CF8',
    primaryText: '#111111',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const FontSize = {
  body: 18,
  bodyLarge: 20,
  label: 15,
  title: 26,
  heading: 22,
} as const;

// Every tap target (buttons, list rows, tab bar items) should be at least
// this tall so it's easy to hit accurately for users who aren't precise
// with small touch targets.
export const MinTouchTarget = 52;

export const Radius = {
  card: 18,
  pill: 999,
  input: 14,
} as const;

// A single, subtle elevation used everywhere a "card" appears, so the app
// reads as a stack of real surfaces instead of flat blocks of color.
// iOS/Android use different shadow APIs, hence the split.
export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
}) as object;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 640;
