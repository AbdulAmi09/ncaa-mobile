import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MinTouchTarget, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError('That email or password is not correct. Please try again.');
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.center}>
              NCAA Arbiters
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Sign in with the same email and password you use on the NCAA website.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <ThemedText type="smallBold">Email address</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
            />

            <ThemedText type="smallBold" style={styles.fieldSpacing}>
              Password
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
            />

            {!!error && (
              <ThemedText themeColor="danger" style={styles.fieldSpacing}>
                {error}
              </ThemedText>
            )}

            <ThemedView style={styles.fieldSpacing}>
              <BigButton label="Sign in" onPress={handleLogin} loading={loading} />
            </ThemedView>

            <ThemedText themeColor="textSecondary" style={[styles.center, styles.helpText]}>
              Forgot your password, or need help signing in? Contact your zone secretary.
            </ThemedText>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    justifyContent: 'center',
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.six,
  },
  form: {
    gap: Spacing.one,
  },
  center: { textAlign: 'center' },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    minHeight: MinTouchTarget,
    fontSize: 18,
  },
  fieldSpacing: { marginTop: Spacing.three },
  helpText: { marginTop: Spacing.four },
});
