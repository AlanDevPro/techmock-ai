// hooks/useThemeStyles.ts
import { useThemeContext } from '../components/providers/ThemeProvider';

export function useThemeStyles() {
  const { themeClasses } = useThemeContext();
  return themeClasses;
}

// O todavía más específico
export function useTextColors() {
  const { themeClasses } = useThemeContext();
  return {
    primary: themeClasses.textPrimary,
    muted: themeClasses.textMuted,
  };
}

export function useBackgroundColors() {
  const { themeClasses } = useThemeContext();
  return {
    page: themeClasses.bg,
    card: themeClasses.cardBg,
  };
}