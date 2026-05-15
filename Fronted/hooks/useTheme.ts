// src/hooks/useTheme.ts
import { themes } from "../theme/theme";
import { useStore } from "../store/useStore";

export function useTheme() {
  const { theme } = useStore();
  return themes[theme] ?? themes.dark;
}