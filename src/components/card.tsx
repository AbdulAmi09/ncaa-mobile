import { View, type ViewProps } from 'react-native';

import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  padded?: boolean;
  tone?: 'surface' | 'selected';
};

// The one card surface used everywhere in the app -- a soft border plus a
// subtle shadow so screens read as a stack of real surfaces instead of flat
// blocks of the same background color. This is the fix for "the UI looks
// scanty/plain": one consistent, slightly elevated container instead of
// bare ThemedViews with no depth.
export function Card({ style, padded = true, tone = 'surface', children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'selected' ? theme.backgroundSelected : theme.backgroundElement,
          borderRadius: Radius.card,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? Spacing.four : 0,
        },
        CardShadow,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
