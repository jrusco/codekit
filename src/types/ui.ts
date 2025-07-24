// UI-specific type definitions - enterprise design system

/**
 * Theme configuration interface - like Spring's @ConfigurationProperties
 */
export interface ThemeConfig {
  readonly colors: ColorPalette;
  readonly spacing: SpacingScale;
  readonly typography: TypographyScale;
  readonly borders: BorderConfig;
  readonly shadows: ShadowConfig;
}

/**
 * Color palette with semantic naming
 */
export interface ColorPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  readonly text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  readonly border: {
    default: string;
    focus: string;
    error: string;
    success: string;
  };
  readonly interactive: {
    tree: string;
    table: string;
    highlight: string;
    hover: string;
  };
  readonly status: {
    error: string;
    warning: string;
    success: string;
    info: string;
  };
}

/**
 * Spacing scale using rem units
 */
export interface SpacingScale {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly xxl: string;
}

/**
 * Typography scale
 */
export interface TypographyScale {
  readonly fontFamily: {
    mono: string;
    sans: string;
  };
  readonly fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  readonly lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

/**
 * Border configuration
 */
export interface BorderConfig {
  readonly radius: {
    sm: string;
    md: string;
    lg: string;
  };
  readonly width: {
    thin: string;
    normal: string;
    thick: string;
  };
}

/**
 * Shadow configuration
 */
export interface ShadowConfig {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly focus: string;
}

/**
 * Component size variants
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/**
 * Component state
 */
export type ComponentState = 'idle' | 'loading' | 'error' | 'success';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly description: string;
  readonly action: () => void;
}