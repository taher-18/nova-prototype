/**
 * Design tokens. Every colour in the app comes from here.
 *
 * The palette is chosen once at startup (dark by default) from a setting
 * read synchronously, so styles can stay static (StyleSheet.create). Changing
 * the appearance saves the setting and reloads the app.
 */
import Storage from 'expo-sqlite/kv-store';
import { Appearance } from 'react-native';

export type ThemeName = 'dark' | 'light';

interface Palette {
  /** Screen background. */
  bg: string;
  /** Cards and grouped rows. */
  surface: string;
  /** Raised elements on a surface (chips, inputs on cards). */
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDark: string;
  onPrimary: string;
  /** Tinted background for selected/highlighted things. */
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  /** Personal-record celebration. */
  gold: string;
  inputBg: string;
  skeleton: string;
  /** Status-bar text colour. */
  statusBar: 'light' | 'dark';
}

const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0E0F13',
    surface: '#17191F',
    surfaceAlt: '#20232B',
    border: '#2A2E38',
    text: '#F3F4F6',
    muted: '#9BA1AD',
    primary: '#FF6B35',
    primaryDark: '#D9521F',
    onPrimary: '#FFFFFF',
    primarySoft: 'rgba(255,107,53,0.16)',
    success: '#2FBF71',
    successSoft: 'rgba(47,191,113,0.16)',
    danger: '#FF5C5C',
    dangerSoft: 'rgba(255,92,92,0.14)',
    warning: '#F5B700',
    gold: '#C99A06',
    inputBg: '#12141A',
    skeleton: '#23262E',
    statusBar: 'light',
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F4F4F7',
    surfaceAlt: '#EAEAF0',
    border: '#E2E2E9',
    text: '#15151C',
    muted: '#6B6B78',
    primary: '#F4511E',
    primaryDark: '#D63F0F',
    onPrimary: '#FFFFFF',
    primarySoft: '#FFEFE8',
    success: '#1E9E5A',
    successSoft: '#E5F5EC',
    danger: '#D93025',
    dangerSoft: '#FDECEA',
    warning: '#B7791F',
    gold: '#B8860B',
    inputBg: '#FFFFFF',
    skeleton: '#E7E7EC',
    statusBar: 'dark',
  },
};

const THEME_KEY = 'appearance.theme';

function readThemeName(): ThemeName {
  try {
    return Storage.getItemSync(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const themeName: ThemeName = readThemeName();
export const colors: Palette = palettes[themeName];

// Native pieces (alerts, pickers, keyboard) follow the app's theme.
try {
  Appearance.setColorScheme(themeName);
} catch {}

/** Saves the appearance; it applies after the app reloads. */
export function saveThemeName(name: ThemeName) {
  Storage.setItemSync(THEME_KEY, name);
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

/** Cairo covers both Arabic and Latin, so one family works for both languages. */
export const fonts = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

/** Minimum touch target for things used between sets (sweaty hands). */
export const TOUCH = 48;
