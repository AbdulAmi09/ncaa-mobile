import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'link';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      // Respect the OS "larger text" accessibility setting instead of
      // fighting it — many arbiters will have this cranked up.
      allowFontScaling
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 15,
    lineHeight: 21,
  },
  smallBold: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  default: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  link: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
});
