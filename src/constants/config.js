// Option colors by index (applies to all questions)
// Neutralized to match teal/white scheme - custom colors preserved in config structure
const NEUTRAL_OPTION_COLOR = 'rgba(255, 255, 255, 0.8)';
export const OPTION_COLORS = [NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR];

// Question type colors - neutralized, same color for all
// Design decisions are handled by UX team, not implementation
export const QUESTION_TYPE_COLORS = {
  default: [NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR],
  selection: [NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR],
  credence: [NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR, NEUTRAL_OPTION_COLOR],
  preset: [
    NEUTRAL_OPTION_COLOR,
    NEUTRAL_OPTION_COLOR,
    NEUTRAL_OPTION_COLOR,
    NEUTRAL_OPTION_COLOR,
    NEUTRAL_OPTION_COLOR,
  ],
};

// Category label color (appears above question heading)
// Neutralized to white to match overall scheme
export const CATEGORY_LABEL_COLOR = 'rgba(255, 255, 255, 0.7)';

// Total budget ($M) above which we warn that results extrapolate past our
// diminishing-returns data. Fixed at $1B per product (task 412). NOTE: the DR
// arrays in current datasets actually run out at 400M — beyond that the curve
// is already held flat at its floor — but the user-facing warning threshold is
// fixed at $1B by decision, independent of where each dataset's data ends.
export const NO_DR_DATA_BUDGET = 1000;

// Color palette
export const COLORS = {
  // Primary colors
  coral: '#E07A5F',
  green: '#81B29A',
  blue: '#98C1D9',
  yellow: '#F2CC8F',
  darkBlue: '#3D5A80',
  orange: '#f97316',
  orangeDark: '#ea580c',
  success: '#10b981',
  successDark: '#059669',

  // Cause-specific colors
  globalHealth: '#F2CC8F',
  animalWelfare: '#81B29A',
  gcr: '#3D5A80',

  // Text colors
  textPrimary: '#f4f4f4',
  textSecondary: 'rgba(255,255,255,0.5)',
  textTertiary: 'rgba(255,255,255,0.7)',
  textGray: '#6b7280',
  textGrayLight: '#9ca3af',
  textGrayMedium: '#e5e7eb',

  // Status colors
  successLight: '#34d399',
  danger: '#f87171',
  warning: '#fdba74',

  // Background overlays
  overlaySubtle: 'rgba(255,255,255,0.03)',
  overlayLight: 'rgba(255,255,255,0.05)',
  overlayMedium: 'rgba(30, 41, 59, 0.6)',
  overlayDark: 'rgba(30, 41, 59, 0.4)',
  overlayDarkAlt: 'rgba(30, 41, 59, 0.5)',
  overlayPanel: 'rgba(6, 78, 59, 0.3)',

  // Border colors
  borderSubtle: 'rgba(255,255,255,0.1)',
  borderMedium: 'rgba(71, 85, 105, 0.5)',
  borderBright: 'rgba(255,255,255,0.2)',
  borderSuccess: 'rgba(16, 185, 129, 0.4)',
  borderOrange: 'rgba(249, 115, 22, 0.4)',

  // Special backgrounds
  bgDark: '#1e293b',
  bgSlate: 'rgb(51,65,85)',

  // Gradient backgrounds
  bgGradient: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  gradientPrimary: 'linear-gradient(90deg, #E07A5F, #81B29A)',
  gradientButton: 'linear-gradient(135deg, #E07A5F 0%, #c65d43 100%)',
  gradientOrange: 'linear-gradient(135deg, #f97316, #ea580c)',
  gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',

  // Badge backgrounds
  badgeOrange: 'rgba(249, 115, 22, 0.3)',
  badgeOrangeBg: 'rgba(249, 115, 22, 0.2)',
  badgeGreen: 'rgba(129, 178, 154, 0.1)',
  badgeGreen2: 'rgba(129, 178, 154, 0.2)',

  // Other
  white: '#fff',
  buttonBorder: '#4b5563',
};

// Typography
export const FONTS = {
  heading: '"Cormorant Garamond", Georgia, serif',
  body: '"Source Sans Pro", sans-serif',
};

// Font sizes (using clamp for responsive sizing where appropriate)
export const FONT_SIZES = {
  xs: '0.7rem',
  sm: '0.75rem',
  base: '0.85rem',
  md: '0.875rem',
  lg: '0.9rem',
  xl: '0.95rem',
  '2xl': '1rem',
  '3xl': '1.15rem',
  '4xl': '1.25rem',
  '5xl': '2.25rem',
  hero: 'clamp(2.5rem, 6vw, 4.5rem)',
  heading: 'clamp(1.5rem, 3vw, 2.25rem)',
};

// Font weights
export const FONT_WEIGHTS = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Input modes
export const INPUT_MODES = {
  OPTIONS: 'options',
  SLIDERS: 'sliders',
};

// Question types
export const QUESTION_TYPES = {
  DEFAULT: 'default',
  SELECTION: 'selection',
  CREDENCE: 'credence',
  INTERMISSION: 'intermission',
  PRESET: 'preset',
  RATIO: 'ratio',
};
