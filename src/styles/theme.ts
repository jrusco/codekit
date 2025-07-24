// Enterprise-grade dark theme - similar to Material Design or Bootstrap theming

import type { ThemeConfig } from '@/types/ui';

/**
 * Professional dark theme configuration
 * Follows accessibility guidelines (WCAG 2.1 AA)
 */
export const darkTheme: ThemeConfig = {
  colors: {
    primary: '#79c0ff',
    secondary: '#56d364',
    accent: '#f2cc60',
    
    background: {
      primary: '#0d1117',    // Main background
      secondary: '#161b22',  // Panel backgrounds
      tertiary: '#21262d'    // Elevated surfaces
    },
    
    text: {
      primary: '#f0f6fc',    // High contrast text
      secondary: '#8b949e',  // Secondary text
      muted: '#6e7681',      // Disabled/muted text
      inverse: '#24292f'     // Text on light backgrounds
    },
    
    border: {
      default: '#30363d',
      focus: '#0969da',
      error: '#f85149',
      success: '#3fb950'
    },
    
    interactive: {
      tree: '#79c0ff',       // JSON tree elements
      table: '#56d364',      // CSV table highlights
      highlight: '#f2cc60',  // General highlights
      hover: '#262c36'       // Hover states
    },
    
    status: {
      error: '#f85149',
      warning: '#d29922',
      success: '#3fb950',
      info: '#79c0ff'
    }
  },
  
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem'      // 48px
  },
  
  typography: {
    fontFamily: {
      mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem'    // 20px
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  
  borders: {
    radius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem'
    },
    width: {
      thin: '1px',
      normal: '2px',
      thick: '4px'
    }
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px rgba(59, 130, 246, 0.1)'
  }
};

/**
 * CSS Custom Properties generator - like Spring Boot's @ConfigurationProperties
 */
export function generateCSSCustomProperties(theme: ThemeConfig): Record<string, string> {
  return {
    // Colors
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    
    '--color-bg-primary': theme.colors.background.primary,
    '--color-bg-secondary': theme.colors.background.secondary,
    '--color-bg-tertiary': theme.colors.background.tertiary,
    
    '--color-text-primary': theme.colors.text.primary,
    '--color-text-secondary': theme.colors.text.secondary,
    '--color-text-muted': theme.colors.text.muted,
    
    '--color-border-default': theme.colors.border.default,
    '--color-border-focus': theme.colors.border.focus,
    
    '--color-interactive-tree': theme.colors.interactive.tree,
    '--color-interactive-table': theme.colors.interactive.table,
    '--color-interactive-highlight': theme.colors.interactive.highlight,
    '--color-interactive-hover': theme.colors.interactive.hover,
    
    '--color-status-error': theme.colors.status.error,
    '--color-status-warning': theme.colors.status.warning,
    '--color-status-success': theme.colors.status.success,
    '--color-status-info': theme.colors.status.info,
    
    // Spacing
    '--spacing-xs': theme.spacing.xs,
    '--spacing-sm': theme.spacing.sm,
    '--spacing-md': theme.spacing.md,
    '--spacing-lg': theme.spacing.lg,
    '--spacing-xl': theme.spacing.xl,
    '--spacing-xxl': theme.spacing.xxl,
    
    // Typography
    '--font-family-mono': theme.typography.fontFamily.mono,
    '--font-family-sans': theme.typography.fontFamily.sans,
    
    '--font-size-xs': theme.typography.fontSize.xs,
    '--font-size-sm': theme.typography.fontSize.sm,
    '--font-size-md': theme.typography.fontSize.md,
    '--font-size-lg': theme.typography.fontSize.lg,
    '--font-size-xl': theme.typography.fontSize.xl,
    
    // Borders
    '--border-radius-sm': theme.borders.radius.sm,
    '--border-radius-md': theme.borders.radius.md,
    '--border-radius-lg': theme.borders.radius.lg,
    
    // Shadows
    '--shadow-sm': theme.shadows.sm,
    '--shadow-md': theme.shadows.md,
    '--shadow-lg': theme.shadows.lg,
    '--shadow-focus': theme.shadows.focus
  };
}