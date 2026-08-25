import { Colors } from '@/constants/theme';
import { useThemeOverride } from '@/lib/theme-override-context';

export function useTheme() {
  const { resolvedScheme } = useThemeOverride();
  return Colors[resolvedScheme];
}
