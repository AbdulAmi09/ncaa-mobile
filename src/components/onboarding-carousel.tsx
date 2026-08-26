import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'people',
    title: 'Welcome to NCAA Arbiters',
    body: 'Everything you need as a Nigeria Chess Arbiters Association arbiter, right here on your phone.',
  },
  {
    icon: 'calendar',
    title: 'Your assignments',
    body: 'See which tournaments you have been assigned to, and accept or decline with one tap.',
  },
  {
    icon: 'cash',
    title: 'Payments made easy',
    body: 'Check what you owe, pay instantly from your phone, and keep every receipt in one place.',
  },
  {
    icon: 'chatbubbles',
    title: 'Stay in touch',
    body: 'Message other arbiters and committee members, and get notified the moment something needs your attention.',
  },
];

// Deliberately not a swipeable ScrollView carousel: button-driven,
// index-only state is simpler, has no ref/measurement edge cases, and for
// an audience that isn't assumed to know swipe gestures a plain "Next"
// button is the more reliable interaction anyway.
export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function goNext() {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.skipRow}>
          <Pressable onPress={onDone} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Skip
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.slide}>
          <ThemedView type="backgroundSelected" style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={48} color={theme.primary} />
          </ThemedView>
          <ThemedText type="title" style={styles.slideTitle}>
            {slide.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.slideBody}>
            {slide.body}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <ThemedView
              key={s.title}
              style={[
                styles.dot,
                { backgroundColor: i === index ? theme.primary : theme.border, width: i === index ? 20 : 8 },
              ]}
            />
          ))}
        </ThemedView>

        <ThemedView style={styles.buttonWrap}>
          <BigButton label={isLast ? 'Get started' : 'Next'} onPress={goNext} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  iconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  slideTitle: { textAlign: 'center' },
  slideBody: { textAlign: 'center' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  dot: { height: 8, borderRadius: 4 },
  buttonWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
});
