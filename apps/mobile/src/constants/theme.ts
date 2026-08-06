// Expanded design tokens — consumed by both NativeWind and StyleSheet (animations, maps, etc.)
export const colors = {
  primary: '#0052CC',
  primaryDark: '#0043A4',
  primarySoft: '#EFF6FF',
  primaryMuted: '#DBEAFE',

  background: '#F8FAFC',
  backgroundBlue: '#F4F7FF',
  surface: '#FFFFFF',

  text: '#0F172A',
  textSecondary: '#334155',
  muted: '#64748B',
  lightMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderStrong: '#CBD5E1',

  // Semantic status
  statusPending: '#F59E0B',
  statusPendingBg: '#FEF3C7',
  statusPendingText: '#92400E',

  statusProcessing: '#3B82F6',
  statusProcessingBg: '#EFF6FF',
  statusProcessingText: '#1D4ED8',

  statusWaiting: '#8B5CF6',
  statusWaitingBg: '#EDE9FE',
  statusWaitingText: '#5B21B6',

  statusResolved: '#10B981',
  statusResolvedBg: '#D1FAE5',
  statusResolvedText: '#047857',

  statusClosed: '#64748B',
  statusClosedBg: '#F1F5F9',
  statusClosedText: '#374151',

  statusRejected: '#EF4444',
  statusRejectedBg: '#FEE2E2',
  statusRejectedText: '#991B1B',

  // Supporting
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  emeraldDark: '#047857',
  red: '#EF4444',
  redLight: '#FEE2E2',
  redDark: '#991B1B',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  purpleDark: '#5B21B6',
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
} as const;

export const spacing = {
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '18': 72,
  '20': 80,
  safeBottom: 34,
  tabBar: 80,
  // Legacy aliases — keep for backward compat with old components
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;


export const typography = {
  // Font sizes
  '2xs': 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,

  // Font weights
  thin: '100' as const,
  extralight: '200' as const,
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,

  // Line heights
  lineHeightNone: 1,
  lineHeightTight: 1.25,
  lineHeightSnug: 1.375,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.625,
  lineHeightLoose: 2,
} as const;

// Font families (Geist)
export const fonts = {
  regular: 'Geist-Regular',
  thin: 'Geist-Thin',
  light: 'Geist-Light',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  bold: 'Geist-Bold',
  extrabold: 'Geist-ExtraBold',
  black: 'Geist-Black',
} as const;

// Animation durations
export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;