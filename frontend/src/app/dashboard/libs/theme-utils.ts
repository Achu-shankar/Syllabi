// Theme utility functions for client-side operations
import { ThemeConfig, EnhancedThemeConfig } from './queries';

/**
 * Checks if a theme object is using the new enhanced format
 * @param theme - The theme object to check
 * @returns True if it's an enhanced theme config
 */
export function isEnhancedThemeConfig(theme: any): theme is EnhancedThemeConfig {
  return theme && typeof theme === 'object' && theme.source && theme.config;
}

/**
 * Extracts the theme config from either enhanced or legacy format
 * @param theme - The theme object (enhanced or legacy)
 * @returns The theme config
 */
export function extractThemeConfig(theme: EnhancedThemeConfig | ThemeConfig | any): ThemeConfig {
  if (isEnhancedThemeConfig(theme)) {
    return theme.config;
  }
  return theme as ThemeConfig;
}

/**
 * Migrates a legacy theme config to the new enhanced format
 * @param legacyTheme - The legacy theme config
 * @param sourceThemeId - The source theme ID if known
 * @returns Enhanced theme config
 */
export function migrateToEnhancedTheme(
  legacyTheme: ThemeConfig, 
  sourceThemeId?: string
): EnhancedThemeConfig {
  return {
    source: {
      type: 'default',
      themeId: sourceThemeId || legacyTheme.themeId || 'default_syllabi_theme',
      lastSyncedAt: new Date().toISOString()
    },
    config: legacyTheme,
    customizations: {
      hasCustomColors: false,
      hasCustomAvatars: !!(legacyTheme.aiMessageAvatarUrl || legacyTheme.userMessageAvatarUrl),
      hasCustomFonts: false
    }
  };
} 