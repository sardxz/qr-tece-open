export const colors = {
  background: '#070816',
  surface: '#0d1022',
  surfaceSoft: '#131730',
  border: '#24284a',
  borderStrong: '#8f46ff',
  text: '#f4f3ff',
  textMuted: '#aaa8c6',
  textSoft: '#807fa2',
  primary: '#8b3dff',
  primaryStrong: '#a855f7',
  primarySoft: 'rgba(139, 61, 255, 0.18)',
  accentBlue: '#3b82f6',
  accentBlueStrong: '#2563eb',
  accentOrange: '#ff8c1a',
  success: '#59d59b',
  error: '#ff7d98',
  warning: '#ffcc66',
  white: '#ffffff',
  black: '#000000',
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  extrabold: 'InterTight_800ExtraBold',
  black: 'InterTight_900Black',
} as const;
